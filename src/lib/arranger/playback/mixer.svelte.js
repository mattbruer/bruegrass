/**
 * Mixer: one channel strip per instrument, a shared reverb bus fed by
 * per-channel sends, and a master fader.
 *
 *   instrument ─▶ strip (fader/pan/mute) ─┬──────────────────────────▶ master ─▶ out
 *                                         └─ send ─▶ reverb ─▶ return ─▶ master
 */

/** Fader floor: at or below this the fader is silent. */
export const FADER_MIN = -60;
export const FADER_MAX = 6;

/**
 * A part is a sub-level inside a channel (e.g. the guitar's bass notes vs.
 * its strums), mixed together before the channel fader.
 * @typedef {{ id: string, name: string, volume: number }} PartSettings
 * @typedef {{ id: string, name: string, volume: number, pan: number, send: number, mute: boolean, parts: PartSettings[] }} ChannelSettings
 */

/** Mixer settings, bound straight to the UI. */
export const mixer = $state({
	/** @type {ChannelSettings[]} */
	channels: [
		{
			id: 'guitar',
			name: 'Guitar',
			volume: 0,
			pan: 0,
			send: -12,
			mute: false,
			parts: [
				{ id: 'bass', name: 'Boom', volume: 0 },
				{ id: 'strum', name: 'Strum', volume: 0 }
			]
		},
		{ id: 'mandolin', name: 'Mandolin', volume: 0, pan: 0, send: -12, mute: false, parts: [] },
		{ id: 'bass', name: 'Bass', volume: 0, pan: 0, send: -18, mute: false, parts: [] },
		{ id: 'melody', name: 'Melody', volume: 0, pan: 0, send: -12, mute: false, parts: [] }
	],
	reverb: { volume: 0, decay: 2.5 },
	master: { volume: 0 }
});

/** The mix the app starts with: every fader where it ships. */
const DEFAULT_MIX = $state.snapshot(mixer);

/** Put every fader, knob and mute back to how the app starts. */
export function resetMix() {
	applyMix(DEFAULT_MIX);
}

/**
 * A plain copy of the mix, to save with an arrangement. Reading it inside an
 * effect tracks every setting, so the effect reruns whenever the mix changes.
 */
export function mixSnapshot() {
	return $state.snapshot(mixer);
}

/**
 * Put a saved mix back. Matches channels and parts by id, so a mix saved
 * before an instrument was added (or after one was removed) still loads,
 * and only known numeric/boolean settings are taken.
 * @param {unknown} saved
 */
export function applyMix(saved) {
	if (!saved || typeof saved !== 'object') return;
	const mix = /** @type {Record<string, any>} */ (saved);
	for (const channel of mixer.channels) {
		const stored = mix.channels?.find?.((/** @type {any} */ c) => c?.id === channel.id);
		if (!stored) continue;
		copyFields(channel, stored, ['volume', 'pan', 'send', 'mute']);
		for (const part of channel.parts) {
			const storedPart = stored.parts?.find?.((/** @type {any} */ p) => p?.id === part.id);
			if (storedPart) copyFields(part, storedPart, ['volume']);
		}
	}
	if (mix.reverb) copyFields(mixer.reverb, mix.reverb, ['volume', 'decay']);
	if (mix.master) copyFields(mixer.master, mix.master, ['volume']);
}

/**
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {string[]} fields
 */
function copyFields(target, source, fields) {
	for (const field of fields) {
		if (typeof source[field] === typeof target[field] && source[field] !== null) {
			target[field] = source[field];
		}
	}
}

/*
 * Fader taper. Like a real console, travel isn't spread evenly across dB:
 * unity gain (0 dB, the signal passed through unchanged) sits three quarters
 * of the way up, the top quarter is boost, and most of the lower travel
 * covers the useful -30 to 0 dB range. The bottom is silence.
 * Points are [position 0–1, dB]; between them it's linear.
 */
const TAPER = [
	[0, FADER_MIN],
	[0.05, -50],
	[0.15, -40],
	[0.25, -30],
	[0.35, -20],
	[0.5, -10],
	[0.625, -5],
	[0.75, 0],
	[1, FADER_MAX]
];
/** Fader position of unity gain. */
export const UNITY = 0.75;
/** Within this many dB of unity, the fader clicks onto it (a detent). */
const UNITY_DETENT_DB = 0.4;

/**
 * Fader position (0–1) for a level in dB.
 * @param {number} db
 */
export function dbToFader(db) {
	if (db <= FADER_MIN) return 0;
	for (let i = 1; i < TAPER.length; i++) {
		const [p0, d0] = TAPER[i - 1];
		const [p1, d1] = TAPER[i];
		if (db <= d1) return p0 + ((db - d0) / (d1 - d0)) * (p1 - p0);
	}
	return 1;
}

/**
 * Level in dB for a fader position (0–1).
 * @param {number} position
 */
export function faderToDb(position) {
	if (position <= 0) return FADER_MIN;
	for (let i = 1; i < TAPER.length; i++) {
		const [p0, d0] = TAPER[i - 1];
		const [p1, d1] = TAPER[i];
		if (position <= p1) {
			const db = d0 + ((position - p0) / (p1 - p0)) * (d1 - d0);
			return Math.abs(db) < UNITY_DETENT_DB ? 0 : Math.round(db * 10) / 10;
		}
	}
	return FADER_MAX;
}

/** @param {number} db */
export function faderGain(db) {
	return db <= FADER_MIN ? -Infinity : db;
}

/** @param {number} db */
export function formatDb(db) {
	if (db <= FADER_MIN) return '-∞';
	return `${db > 0 ? '+' : ''}${db.toFixed(1)}`;
}

const REVERB_SEND = 'reverb';
const DECAY_DEBOUNCE = 150; // ms; reverb regenerates its impulse on decay changes

/**
 * @typedef {{
 *   Tone: typeof import('tone'),
 *   master: import('tone').Channel,
 *   reverb: import('tone').Reverb,
 *   reverbReturn: import('tone').Channel,
 *   strips: Map<string, {
 *     channel: import('tone').Channel,
 *     send: import('tone').Gain<'decibels'>,
 *     parts: Map<string, import('tone').Volume>
 *   }>
 * }} Graph
 */

/** @type {Promise<Graph> | null} */
let graph = null;

async function buildGraph() {
	const Tone = await import('tone');

	const master = new Tone.Channel().toDestination();
	const reverbReturn = new Tone.Channel().connect(master);
	const reverb = new Tone.Reverb({ decay: mixer.reverb.decay, wet: 1 }).connect(reverbReturn);
	const reverbBus = new Tone.Channel().connect(reverb);
	reverbBus.receive(REVERB_SEND);

	/** @type {Graph['strips']} */
	// Audio nodes, not UI state, so this doesn't need to be reactive
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const strips = new Map();
	for (const settings of mixer.channels) {
		const channel = new Tone.Channel().connect(master);
		const send = channel.send(REVERB_SEND, faderGain(settings.send));
		const parts = new Map(
			settings.parts.map((part) => [
				part.id,
				new Tone.Volume(faderGain(part.volume)).connect(channel)
			])
		);
		strips.set(settings.id, { channel, send, parts });
	}

	syncGraph({ Tone, master, reverb, reverbReturn, strips });
	return { Tone, master, reverb, reverbReturn, strips };
}

/**
 * Push mixer settings onto the audio nodes whenever they change.
 * @param {Graph} g
 */
function syncGraph(g) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let decayTimer;

	$effect.root(() => {
		$effect(() => {
			for (const settings of mixer.channels) {
				const strip = g.strips.get(settings.id);
				if (!strip) continue;
				strip.channel.volume.value = faderGain(settings.volume);
				strip.channel.pan.value = settings.pan;
				strip.channel.mute = settings.mute;
				strip.send.gain.value = faderGain(settings.send);
				for (const part of settings.parts) {
					const node = strip.parts.get(part.id);
					if (node) node.volume.value = faderGain(part.volume);
				}
			}
		});

		$effect(() => {
			g.reverbReturn.volume.value = faderGain(mixer.reverb.volume);
			g.master.volume.value = faderGain(mixer.master.volume);
		});

		$effect(() => {
			const decay = mixer.reverb.decay;
			clearTimeout(decayTimer);
			decayTimer = setTimeout(() => {
				if (g.reverb.decay !== decay) g.reverb.decay = decay;
			}, DECAY_DEBOUNCE);
		});
	});
}

/**
 * The node an instrument should connect its output to: the channel itself,
 * or one of its parts when `part` is given.
 * @param {string} id
 * @param {string} [part]
 * @returns {Promise<import('tone').ToneAudioNode>}
 */
export async function getChannel(id, part) {
	graph ??= buildGraph();
	const strip = (await graph).strips.get(id);
	if (!strip) throw new Error(`No mixer channel: ${id}`);
	if (part === undefined) return strip.channel;

	const node = strip.parts.get(part);
	if (!node) throw new Error(`No ${part} part on mixer channel: ${id}`);
	return node;
}
