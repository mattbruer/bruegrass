/**
 * Live playback: the band (instruments/band.js) playing the song on a loop
 * through the live mixer, until stopped.
 */
import { preparePerformance } from '../instruments/performance.js';
import { createBand } from '../instruments/band.js';
import { getChannel } from './mixerGraph.svelte.js';
import { createStream } from './scheduler.js';
import { rhythm } from '../chart/timeline.js';

/** Lead before the first note, so nothing is clipped (seconds). */
const START_DELAY = 0.1;
/** Queue notes this far ahead of the audio clock (seconds). */
const LOOKAHEAD = 2;
/** Seconds between scheduler runs; each queues only what's newly due. */
const TICK = 0.1;

/**
 * Play the arrangement on a loop until stopped. Resolves once the first pass
 * is scheduled; later passes are scheduled shortly before they start.
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ capo?: number, transpose?: number, bpm?: number, melody?: import('../melody/melody.js').MelodyPart | null }} options
 *   transpose: semitones on top of the capo, for every instrument;
 *   melody: from melodyEvents() for these sections at this tempo, played on
 *   the guitar samples through the Melody channel, locked to the band
 * @returns {Promise<{
 *   stop: () => void,
 *   beats: () => { elapsed: number, length: number } | null,
 *   position: () => (import('../chart/timeline.js').SlotPosition & { beat: number, role: 'boom' | 'chuck', progress: number }) | null
 * }>}
 */
export async function playArrangement(sections, options = {}) {
	/*
	 * iPhone: the ring/silent switch mutes Web Audio unless the page says it
	 * plays music, as a music app does (Safari 16.4+'s Audio Session API).
	 * Set before anything is awaited, while we're still inside the tap.
	 */
	const audioSession = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (audioSession) audioSession.type = 'playback';

	const performance = preparePerformance(sections, { ...options, loop: true });
	const { passLength: duration, quarter } = performance;
	const { slots: positions, beats: grid } = rhythm(sections);

	const Tone = await import('tone');
	await Tone.start();
	const band = await createBand(Tone, performance, getChannel);

	/*
	 * Timing. Every note is placed on the audio hardware's sample clock at an
	 * absolute time, start + pass × duration + offset, all from one fixed
	 * origin; nothing is timed relative to the previous note or pass, so error
	 * can't accumulate however long it loops. The timer below only decides
	 * *when to queue* upcoming passes. It runs on Tone's clock (a worker
	 * ticking against the audio clock, unaffected by background-tab timer
	 * throttling), queues everything due within the lookahead, catches up if
	 * it was ever late, and never plays a note after its time has passed.
	 */
	const context = Tone.getContext();
	// The band waits for the melody's pickup, so bar 1 lands together
	const start = Tone.now() + START_DELAY + (performance.melody?.leadIn ?? 0);
	/** @type {number | undefined} */
	let timer;
	let stopped = false;

	const streams = band.streams.map(({ notes, period, play }) => ({
		stream: createStream(notes, period),
		play
	}));
	band.playIntro(start);

	/*
	 * Lookahead scheduler: every TICK, queue just the notes due within the
	 * lookahead. The work is spread evenly (a few notes per tick) instead of a
	 * whole pass at once, which would stall the main thread and make the
	 * scrolling chart stutter.
	 */
	function tick() {
		if (stopped) return;
		const now = Tone.now() - start;
		for (const { stream, play } of streams) {
			stream.skipBefore(now); // never play a note late
			for (const { note, index, at } of stream.take(now + LOOKAHEAD)) {
				play(note, index, start + at);
			}
		}
		timer = context.setTimeout(tick, TICK);
	}

	tick();

	return {
		/**
		 * The audio clock in quarter notes: `elapsed` from bar 1 of the first
		 * pass (negative during the melody's pickup), `length` of one pass.
		 */
		beats() {
			if (stopped) return null;
			return { elapsed: (Tone.immediate() - start) / quarter, length: duration / quarter };
		},
		/** Where playback is right now, by the audio clock. */
		position() {
			const elapsed = Tone.immediate() - start;
			if (stopped || elapsed < 0) return null;
			const inPass = elapsed % duration;
			const q = Math.min(Math.floor(inPass / quarter), grid.length - 1);
			const slot = positions[grid[q].slot];
			return {
				...slot,
				beat: q - slot.start, // quarter note within this chord
				role: grid[q].role,
				// progress: 0–1 through the current pass, for smooth scrolling
				progress: inPass / duration
			};
		},
		stop() {
			stopped = true;
			if (timer !== undefined) context.clearTimeout(timer);
			band.stop();
		}
	};
}
