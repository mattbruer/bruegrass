/**
 * The mixer's settings: one channel strip per instrument, the reverb aux,
 * and the master. The mixer UI binds straight to `mixer`, and the audio
 * follows it (mixerGraph.svelte.js).
 *
 *   instrument ─▶ channel (fader, pan, mute/solo) ─┬────────────────────────────▶ master ─▶ out
 *                                                  └─ send ─▶ reverb aux ───────▶ master
 *                                                            (reverb plugin, fader, mute)
 *   master ─▶ output stage (gain to a loudness target, true-peak limiter) ─▶ speakers
 */
import { REVERB_DEFAULTS } from './reverb/reverbSettings.js';
import { FADER_MIN } from './faderTaper.js';
import { flatEq } from './eq/eqBands.js';
import { DEFAULT_OUTPUT_GAIN_DB } from './output/outputSettings.js';
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';

/*
 * The default mix: a loose, natural bluegrass balance. Change it here.
 *
 *   - Guitar and mandolin sit a little apart in the stereo field (not
 *     hard-panned); bass, melody and harmony parts stay in the centre.
 *   - The reverb is subtle: guitar, mandolin, melody and harmony send fully to it,
 *     the bass not at all (reverb on bass muddies the low end), and the
 *     reverb's own fader sits well down, so you only notice it if you
 *     listen for it.
 */
const PAN_SPREAD = 0.35; // 35% left/right
const SEND_FULLY = 0; // dB: the top of the send's travel
const SEND_NONE = FADER_MIN;
const REVERB_LEVEL_DB = -15;

/**
 * A part is a sub-level inside a channel (e.g. the guitar's bass notes vs.
 * its strums), mixed together before the channel fader.
 * @typedef {{ id: string, name: string, volume: number }} PartSettings
 * @typedef {{
 *   id: string, name: string,
 *   volume: number, pan: number, send: number,
 *   mute: boolean, solo: boolean,
 *   eq: import('./eq/eqBands.js').EqSettings,
 *   parts: PartSettings[]
 * }} ChannelSettings
 *   volume, send: dB; pan: -1 (left) to 1 (right)
 */

/**
 * One instrument's channel, with the defaults most channels share.
 * @param {{ id: string, name: string, pan?: number, send?: number, parts?: PartSettings[] }} channel
 * @returns {ChannelSettings}
 */
function channelStrip({ id, name, pan = 0, send = SEND_FULLY, parts = [] }) {
	return { id, name, volume: 0, pan, send, mute: false, solo: false, eq: flatEq(), parts };
}

export const mixer = $state({
	channels: [
		channelStrip({
			id: 'guitar',
			name: 'Guitar',
			pan: PAN_SPREAD,
			parts: [
				{ id: 'bass', name: 'Boom', volume: 0 },
				{ id: 'strum', name: 'Strum', volume: 0 }
			]
		}),
		channelStrip({ id: 'mandolin', name: 'Mandolin', pan: -PAN_SPREAD }),
		channelStrip({ id: 'bass', name: 'Bass', send: SEND_NONE }),
		channelStrip({ id: 'melody', name: 'Melody' }),
		// One per harmony part; the mixer shows them only while the song has the part
		...HARMONY_PARTS.map((part) => channelStrip({ id: part.id, name: part.name })),
		// One per record track; the mixer shows them only while the track has a take
		...RECORD_TRACKS.map((track) => channelStrip({ id: track.id, name: track.name }))
	],
	/** The reverb aux: its fader sets the overall reverb level; the plugin shapes the sound. */
	reverb: {
		volume: REVERB_LEVEL_DB,
		mute: false,
		eq: flatEq(),
		/** @type {import('./reverb/reverbSettings.js').ReverbSettings} */
		plugin: { ...REVERB_DEFAULTS }
	},
	/** The master: its EQ shapes the whole mix. */
	master: { volume: 0, eq: flatEq() },
	/**
	 * The output stage after the master (see output/): `gain` (dB) brings
	 * the mix up to a loudness target; a limiter after it stops any clipping.
	 */
	output: { gain: DEFAULT_OUTPUT_GAIN_DB }
});

/** The mix the app starts with (what New and "reset" go back to). */
const DEFAULT_MIX = $state.snapshot(mixer);

/**
 * A channel's default settings, for resetting one control at a time.
 * @param {string} id
 */
export function defaultChannel(id) {
	const channel = DEFAULT_MIX.channels.find((each) => each.id === id);
	if (!channel) throw new Error(`No mixer channel: ${id}`);
	return channel;
}

/** The reverb aux's and master's default fader levels, and the default output gain, in dB. */
export const DEFAULT_REVERB_LEVEL_DB = DEFAULT_MIX.reverb.volume;
export const DEFAULT_MASTER_LEVEL_DB = DEFAULT_MIX.master.volume;
export const DEFAULT_OUTPUT_GAIN = DEFAULT_MIX.output.gain;

/** Is any channel soloed? (Then only soloed channels are heard, plus the reverb.) */
export function anyChannelSoloed() {
	return mixer.channels.some((channel) => channel.solo);
}

/** Put every fader, knob, mute and solo back to how the app starts. */
export function resetMix() {
	applyMix(DEFAULT_MIX);
}

/**
 * A plain copy of the mix, to save with a song. Solo is left out: it's for
 * listening while you work, not part of the mix. Reading this inside an
 * effect tracks every setting, so the effect reruns whenever the mix changes.
 */
export function mixSnapshot() {
	const snapshot = $state.snapshot(mixer);
	for (const channel of snapshot.channels) delete (/** @type {any} */ (channel).solo);
	return snapshot;
}

/**
 * Put a saved mix back. Channels and parts are matched by id, so a mix
 * saved before an instrument was added (or after one was removed) still
 * loads, and only settings of the right type are taken. Solos are cleared.
 * @param {unknown} saved
 */
export function applyMix(saved) {
	if (!saved || typeof saved !== 'object') return;
	const mix = /** @type {Record<string, any>} */ (saved);

	for (const channel of mixer.channels) {
		channel.solo = false;
		const stored = findById(mix.channels, channel.id);
		if (!stored) continue;
		copyMatching(channel, stored, ['volume', 'pan', 'send', 'mute']);
		applyEq(channel.eq, stored.eq);
		for (const part of channel.parts) {
			const storedPart = findById(stored.parts, part.id);
			if (storedPart) copyMatching(part, storedPart, ['volume']);
		}
	}

	if (mix.reverb) {
		copyMatching(mixer.reverb, mix.reverb, ['volume', 'mute']);
		applyEq(mixer.reverb.eq, mix.reverb.eq);
		const plugin = mix.reverb.plugin ?? { decay: mix.reverb.decay }; // older mixes kept only a decay
		copyMatching(mixer.reverb.plugin, plugin, Object.keys(REVERB_DEFAULTS));
	}
	if (mix.master) {
		copyMatching(mixer.master, mix.master, ['volume']);
		applyEq(mixer.master.eq, mix.master.eq);
	}
	// Songs saved before the output stage existed get the default gain
	copyMatching(mixer.output, mix.output ?? DEFAULT_MIX.output, ['gain']);
}

/**
 * Every strip that has an EQ, in console order: each channel, then the
 * reverb aux and the master. The EQ window, presets and listening setups
 * all find a strip's EQ through this.
 * @returns {{ id: string, name: string, eq: import('./eq/eqBands.js').EqSettings }[]}
 */
export function stripsWithEq() {
	return [
		...mixer.channels.map((channel) => ({ id: channel.id, name: channel.name, eq: channel.eq })),
		{ id: 'reverb', name: 'Reverb', eq: mixer.reverb.eq },
		{ id: 'master', name: 'Master', eq: mixer.master.eq }
	];
}

/**
 * One strip's name and EQ, for a channel id, 'reverb' or 'master'.
 * @param {string} stripId
 */
export function stripWithEq(stripId) {
	const strip = stripsWithEq().find((each) => each.id === stripId);
	if (!strip) throw new Error(`No mixer strip: ${stripId}`);
	return strip;
}

/**
 * A plain copy of every strip's EQ, by strip id: what a listening setup saves.
 * @returns {Record<string, import('./eq/eqBands.js').EqSettings>}
 */
export function eqsSnapshot() {
	return Object.fromEntries(stripsWithEq().map((strip) => [strip.id, $state.snapshot(strip.eq)]));
}

/**
 * Put saved EQs back on the strips they belong to (by strip id). A strip
 * that isn't in `saved` keeps its EQ as it is.
 * @param {unknown} saved
 */
export function applyEqs(saved) {
	if (!saved || typeof saved !== 'object') return;
	const byStrip = /** @type {Record<string, unknown>} */ (saved);
	for (const strip of stripsWithEq()) {
		if (byStrip[strip.id]) applyEq(strip.eq, byStrip[strip.id]);
	}
}

/**
 * Put a saved EQ back, band by band, taking only settings of the right
 * type. A mix saved before EQs existed has none, which leaves the EQ flat.
 * @param {import('./eq/eqBands.js').EqSettings} target
 * @param {any} saved
 */
export function applyEq(target, saved) {
	const savedEq = saved ?? flatEq();
	copyMatching(target, savedEq, ['enabled']);
	for (const band of target.bands) {
		const savedBand = findById(savedEq.bands, band.id);
		if (savedBand) copyMatching(band, savedBand, ['on', 'frequency', 'gain', 'q', 'slope']);
	}
}

/**
 * @param {unknown} list
 * @param {string} id
 */
function findById(list, id) {
	return Array.isArray(list) ? list.find((item) => item?.id === id) : undefined;
}

/**
 * Copy the named fields, but only where the saved value has the same type.
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {string[]} fields
 */
function copyMatching(target, source, fields) {
	for (const field of fields) {
		if (source[field] !== null && typeof source[field] === typeof target[field]) {
			target[field] = source[field];
		}
	}
}
