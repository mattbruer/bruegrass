/**
 * Live playback: the band (instruments/band.js) playing the song on a loop
 * through the live mixer, until stopped.
 */
import { forPlayback } from '$lib/audio/audioSession.js';
import { preparePerformance } from '../instruments/performance.js';
import { createBand } from '../instruments/band.js';
import { getChannel } from '../mixer/mixerGraph.svelte.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { channelInstrument } from '../instruments/tuneInstruments.js';
import { createStream } from './scheduler.js';
import { rhythm } from '../chart/timeline.js';
import { songClickGrid } from './metronome/clickGrid.js';
import { createTakePlayback } from '../takes/playTakes.js';
import { sungPickup } from '../takes/takePickup.js';
import { firstBar } from '../takes/takeTiming.js';

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
 * @param {{
 *   capo?: number, transpose?: number, bpm?: number,
 *   melody?: import('../melody/melody.js').MelodyPart | null,
 *   bass?: import('../instruments/bassline.js').BassNote[] | null, offset?: number,
 *   chops?: import('../instruments/chopEdits.js').ChopEdits,
 *   swing?: number,
 *   tempoCurve?: import('../chart/tempoCurve.js').TempoPoint[],
 *   takes?: import('../takes/playTakes.js').PlayableClip[],
 *   regionStart?: number, countIn?: number, passes?: number, from?: number
 * }} options
 *   transpose: semitones on top of the capo, for every instrument;
 *   melody: from melodyEvents() for these sections at this tempo, played on
 *   the guitar samples through the Melody channel, locked to the band;
 *   bass, offset: the song's edited bass line and where these sections start
 *   in it (quarters), see preparePerformance; chops: the mandolin chops you've changed;
 *   takes: recorded takes to play with it; regionStart: where these sections
 *   start in the song (seconds), for the takes;
 *   countIn: at least this long before bar 1 (seconds), e.g. a bar of clicks to record after;
 *   passes: play only this many passes (default: loop until stopped);
 *   from: start this far into the pass (quarters), to carry on where it stopped
 * @returns {Promise<{
 *   stop: () => void,
 *   barOne: number,
 *   pickup: number,
 *   passLength: number,
 *   beats: () => { elapsed: number, length: number } | null,
 *   secondsLeft: () => number,
 *   clicks: { origin: number, from: number, clock: import('../chart/tempoCurve.js').TempoClock, grid: import('./metronome/clickGrid.js').ClickGrid },
 *   position: () => (import('../chart/timeline.js').SlotPosition & { beat: number, role: 'boom' | 'chuck', progress: number }) | null
 * }>}
 */
export async function playArrangement(sections, options = {}) {
	/*
	 * iPhone: the ring/silent switch mutes Web Audio unless the page says it
	 * plays music, as a music app does (Safari 16.4+'s Audio Session API).
	 * Set before anything is awaited, while we're still inside the tap.
	 */
	forPlayback();

	const performance = preparePerformance(sections, { ...options, loop: true });
	const { passLength: duration, quarter, clock } = performance;
	const { slots: positions, beats: grid } = rhythm(sections);

	const Tone = await import('tone');
	await Tone.start();
	const band = await createBand(Tone, performance, getChannel, {
		instrumentOf: (channelId) => channelInstrument(mixer.channels, channelId)
	});

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
	// The band waits for a pickup (the melody's, or one sung on a take) or a count-in, so bar 1 lands together
	const fromTheTop = (options.regionStart ?? 0) === 0;
	const from = options.from ?? 0;
	const lead =
		from > 0
			? (options.countIn ?? 0)
			: Math.max(
					performance.melody?.leadIn ?? 0,
					fromTheTop
						? sungPickup(options.takes ?? [], firstBar(sections, 60 / quarter).seconds)
						: 0,
					options.countIn ?? 0
				);
	const takes = await createTakePlayback(
		Tone,
		options.takes ?? [],
		{ regionStart: options.regionStart ?? 0, passLength: duration, lead },
		getChannel
	);
	// Carrying on part way through: bar 1 was in the past, and the notes before now are skipped
	const start = Tone.now() + START_DELAY + lead - clock.secondsAt(from);
	const end = options.passes ? options.passes * duration : Infinity;
	/** @type {number | undefined} */
	let timer;
	let stopped = false;

	const streams = [...band.streams, takes.stream].map(({ notes, period, play }) => ({
		stream: createStream(notes, period),
		play
	}));
	if (from === 0) band.playIntro(start);

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
			for (const { note, index, at } of stream.take(Math.min(now + LOOKAHEAD, end))) {
				play(note, index, start + at);
			}
		}
		timer = context.setTimeout(tick, TICK);
	}

	tick();

	return {
		/** The audio-clock time of bar 1 of the first pass (seconds). */
		barOne: start,
		/** When the band comes in: bar 1, or where it carries on from (audio-clock seconds). */
		startsAt: start + clock.secondsAt(from),
		/** How long the melody's pickup is before bar 1 (seconds; 0 without one). */
		pickup: performance.melody?.leadIn ?? 0,
		/** One pass, in seconds. */
		passLength: duration,
		/** Seconds until the last pass ends (Infinity while it loops). */
		secondsLeft: () => start + end - Tone.now(),
		/**
		 * The audio clock in quarter notes: `elapsed` from bar 1 of the first
		 * pass (negative during the melody's pickup), `length` of one pass.
		 */
		beats() {
			if (stopped || Tone.immediate() - start >= end) return null; // done, only ringing
			return { elapsed: clock.quartersAt(Tone.immediate() - start), length: clock.passQuarters };
		},
		/** Where playback is right now, by the audio clock. */
		position() {
			const elapsed = Tone.immediate() - start;
			if (stopped || elapsed < 0 || elapsed >= end) return null;
			const inPass = clock.quartersAt(elapsed) % clock.passQuarters;
			const q = Math.min(Math.floor(inPass), grid.length - 1);
			const slot = positions[grid[q].slot];
			return {
				...slot,
				beat: q - slot.start, // quarter note within this chord
				role: grid[q].role,
				// progress: 0–1 through the current pass, for smooth scrolling
				progress: inPass / clock.passQuarters
			};
		},
		/**
		 * The song's clicks, on this playback's clock (for a metronome that
		 * follows the bars), from when the band comes in: before that is the count-in's.
		 */
		clicks: {
			origin: start,
			from: start + clock.secondsAt(from),
			clock,
			grid: songClickGrid(sections)
		},
		stop() {
			stopped = true;
			if (timer !== undefined) context.clearTimeout(timer);
			band.stop();
			takes.stop();
		}
	};
}
