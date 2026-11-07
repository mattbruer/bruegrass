/**
 * Render the song to audio, faster than real time, with Web Audio's
 * OfflineAudioContext (through Tone.Offline). It's the same band
 * (instruments/band.js) and the same mixer (playback/graph/buildMixerGraph.js)
 * as live playback, so the file sounds like what you hear.
 *
 *   - Full mix: as you hear it, through the master and the loudness stage.
 *   - Stems: one file per instrument, all from one render (each to its own
 *     channels of a ChannelMergerNode), so they're sample-aligned:
 *       dry (default): each instrument after its input trim, before EQ,
 *         fader, pan and reverb, as a mono file: what a DAW mix starts from
 *       processed: after each channel's EQ, fader and pan, plus a Reverb
 *         stem, so together they add up to the mix (before the master)
 *     Stems ignore mutes and solos: every instrument gets its file.
 *
 * Length: one pass of the whole arrangement (not the loop region), then a
 * tail for the reverb to ring out. Every file starts at the same moment and
 * lines up with the .mid file: when the melody has a pickup, the band's bar 1
 * starts one bar in (the MIDI file's lead-in bar).
 *
 * Rendering takes over Tone's global context, so stop live playback first.
 */
import { preparePerformance } from '../instruments/performance.js';
import { createBand } from '../instruments/band.js';
import { buildMixerGraph } from '../playback/graph/buildMixerGraph.js';
import { melodyEvents } from '../melody/melody.js';
import { channelsInUse, isTuneChannel } from '../melody/harmony/partChannels.js';
import { DEFAULT_METER, barQuarters, slotPositions } from '../chart/timeline.js';

/** Exported files' sample rate: the usual rate for music made with video or a DAW. */
export const EXPORT_SAMPLE_RATE = 48000;
/** The tail after the last bar, for the reverb to ring out: its decay plus this, in seconds… */
const TAIL_PAST_DECAY = 1;
/** …but never shorter or longer than these. */
const TAIL_MIN = 2;
const TAIL_MAX = 8;

/**
 * @typedef {{
 *   sections: import('../chart/timeline.js').Section[],
 *   bpm: number, capo: number, transpose: number,
 *   melody: import('../melody/melody.js').Melody | null
 * }} Song
 * @typedef {ReturnType<typeof import('../playback/mixer.svelte.js').mixSnapshot>} Mix
 * @typedef {{ name: string, channels: Float32Array[] }} RenderedFile
 *   channels: one (mono) or two (stereo) arrays of samples, -1 to 1
 */

/**
 * The full mix, as you hear it.
 * @param {Song} song
 * @param {Mix} mix
 * @returns {Promise<RenderedFile>}
 */
export async function renderMix(song, mix) {
	const Tone = await import('tone');
	const plan = planRender(song, mix);

	const buffer = await renderOffline(Tone, plan.seconds, 2, async () => {
		const graph = await buildMixerGraph(Tone, mix);
		Tone.connect(graph.output.output, Tone.getDestination());
		await playOnePass(Tone, plan, graph);
	});
	return { name: 'Full mix', channels: [buffer.getChannelData(0), buffer.getChannelData(1)] };
}

/**
 * One file per instrument (plus Reverb when processed).
 * @param {Song} song
 * @param {Mix} mix
 * @param {{ processed: boolean }} options processed: with the mix's EQ, levels, pan and reverb
 * @returns {Promise<RenderedFile[]>}
 */
export async function renderStems(song, mix, { processed }) {
	const Tone = await import('tone');
	const stemMix = processed ? withoutMutes(mix) : dry(mix);
	const plan = planRender(song, stemMix);
	const tuneChannels = channelsInUse(song.melody);
	const instruments = mix.channels.filter(
		(channel) => !isTuneChannel(channel.id) || tuneChannels.has(channel.id)
	);
	const stems = [
		...instruments.map((channel) => ({ id: channel.id, name: channel.name })),
		...(processed ? [{ id: 'reverb', name: 'Reverb' }] : [])
	];

	const buffer = await renderOffline(Tone, plan.seconds, stems.length * 2, async () => {
		const graph = await buildMixerGraph(Tone, stemMix);
		const audio = Tone.getContext().rawContext;

		// Each stem gets its own pair of the render's channels
		const merger = audio.createChannelMerger(stems.length * 2);
		stems.forEach((stem, index) => {
			const strip = graph.strips.get(stem.id);
			const source =
				stem.id === 'reverb' ? graph.reverbAux : processed ? strip?.channel : strip?.input;
			if (!source) return;
			// Mono sources come out on both sides, so every stem is a stereo pair here
			const bus = audio.createGain();
			bus.channelCount = 2;
			bus.channelCountMode = 'explicit';
			bus.channelInterpretation = 'speakers';
			const split = audio.createChannelSplitter(2);
			Tone.connect(source, bus);
			bus.connect(split);
			split.connect(merger, 0, index * 2);
			split.connect(merger, 1, index * 2 + 1);
		});
		// An offline context's output already has one channel per stem side
		// (its channel count is fixed, and setting it throws); just keep every
		// channel separate instead of mixing them as speakers
		audio.destination.channelInterpretation = 'discrete';
		merger.connect(audio.destination);

		await playOnePass(Tone, plan, graph);
	});

	return stems.map((stem, index) => ({
		name: stem.name,
		// Dry stems are mono instruments: one channel (both sides are the same)
		channels: processed
			? [buffer.getChannelData(index * 2), buffer.getChannelData(index * 2 + 1)]
			: [buffer.getChannelData(index * 2)]
	}));
}

/**
 * Render offline, then clean up after it whatever happens.
 *
 * Tone.Offline switches Tone's global context to an offline one while the
 * render is set up, but only switches back if that setup succeeds, and it
 * never disposes the offline context. So: always put the live context back
 * (a failed export must not break playback), and always dispose the offline
 * one (with everything Tone built in it), so exports don't pile up.
 * @param {typeof import('tone')} Tone
 * @param {number} seconds
 * @param {number} channels
 * @param {() => Promise<void>} setUp builds and schedules everything, in the offline context
 * @returns {Promise<AudioBuffer>}
 */
async function renderOffline(Tone, seconds, channels, setUp) {
	const live = Tone.getContext();
	/** @type {import('tone').BaseContext | null} */
	let offline = null;
	try {
		const rendered = await Tone.Offline(
			async (context) => {
				offline = context;
				await setUp();
			},
			seconds,
			channels,
			EXPORT_SAMPLE_RATE
		);
		return /** @type {AudioBuffer} */ (rendered.get());
	} finally {
		if (Tone.getContext() !== live) Tone.setContext(live);
		/** @type {import('tone').BaseContext | null} */ (offline)?.dispose();
	}
}

/**
 * The notes, where bar 1 falls, and how long the render is.
 * @param {Song} song
 * @param {Mix} mix
 */
function planRender(song, mix) {
	const { sections, bpm, capo, transpose } = song;
	const melody = song.melody
		? melodyEvents(song.melody, { sections, bpm, shift: transpose, loop: false })
		: null;
	const performance = preparePerformance(sections, { bpm, capo, transpose, loop: false, melody });

	// The .mid file's lead-in: a bar for the pickup, so bar 1 is on a bar line
	const firstMeter = slotPositions(sections)[0]?.meter ?? DEFAULT_METER;
	const barOne =
		melody && melody.intro.length > 0 ? barQuarters(firstMeter) * performance.quarter : 0;

	const decay = mix.reverb.plugin.enabled ? mix.reverb.plugin.decay : 0;
	const tail = Math.min(TAIL_MAX, Math.max(TAIL_MIN, decay + TAIL_PAST_DECAY));

	return { performance, barOne, seconds: barOne + performance.passLength + tail };
}

/**
 * Build the band in the offline context and queue one pass of every note.
 * @param {typeof import('tone')} Tone
 * @param {ReturnType<typeof planRender>} plan
 * @param {import('../playback/graph/buildMixerGraph.js').MixerGraph} graph
 */
async function playOnePass(Tone, { performance, barOne }, graph) {
	const band = await createBand(Tone, performance, graph.channelInput, { live: false });
	band.playIntro(barOne);
	for (const { notes, play } of band.streams) {
		notes.forEach((note, index) => {
			if (note.time < performance.passLength) play(note, index, barOne + note.time);
		});
	}
}

/**
 * Processed stems: the mix as set, but every instrument heard.
 * @param {Mix} mix
 * @returns {Mix}
 */
function withoutMutes(mix) {
	const copy = structuredClone(mix);
	for (const channel of copy.channels) {
		channel.mute = false;
		/** @type {any} */ (channel).solo = false;
	}
	copy.reverb.mute = false;
	return copy;
}

/**
 * Dry stems: every level at unity (the stems are taken before the EQ,
 * fader, pan and reverb, so only the guitar's part levels matter here).
 * @param {Mix} mix
 * @returns {Mix}
 */
function dry(mix) {
	const copy = withoutMutes(mix);
	for (const channel of copy.channels) {
		for (const part of channel.parts) part.volume = 0;
	}
	return copy;
}
