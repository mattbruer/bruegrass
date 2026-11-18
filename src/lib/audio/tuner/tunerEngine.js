/**
 * The tuner, as plain sample-in, reading-out code (the worklet runs it; a
 * Node script can too). Two stages, as the most accurate tuners do it:
 *
 *   1. Which note: findPitch.js (McLeod) every ~20 ms, through noteLock.js
 *      so the shown note doesn't flicker.
 *   2. How many cents: a lock-in (lockIn.js) on the note's first few
 *      partials every 128 samples, and a line fitted through each one's
 *      phase (phaseSlope.js). The partials are weighed by strength, so a
 *      phone mic's weak low E is read from its stronger second partial.
 *
 * Until the fit has enough behind it (just after a pluck) the cents are
 * McLeod's own.
 */
import { createPitchFinder } from './findPitch.js';
import { createNoteLock } from './noteLock.js';
import { lockInWindow, measurePhase } from './lockIn.js';
import { createPhaseSlope } from './phaseSlope.js';

/** Samples kept: room for the longest lock-in window (8 periods of 30 Hz). */
const HISTORY = 16384;
const PITCH_WINDOW = 4096;
/** Samples between note finds (and between readings sent out). */
const PITCH_EVERY = 1024;
/** Samples between lock-in measurements: often enough that no partial turns half a cycle in between. */
const LOCK_IN_EVERY = 128;
const PARTIALS = 4;
const LOCK_IN_SHAPE = { periods: 8, minSeconds: 0.08 };
/** The cents are a line through this much of the past (seconds). */
const FIT_SECONDS = 0.4;
/** …and come from the lock-in once it has this much (seconds). */
const FIT_NEEDED = 0.08;
/** The lock-in is only trusted within this much of McLeod's reading (cents). */
const LOCK_IN_AGREES = 25;
/** Quieter than this (RMS) is silence. */
const SILENCE = 0.001;
/** A block this much louder than the one before is a new pluck: the fit starts again. */
const PLUCK_RISE = 2;
/** A note goes on being heard through a gap this short in McLeod's readings (seconds). */
const STILL_HEARD = 0.15;

/**
 * @typedef {{
 *   note: number | null,
 *   cents: number | null,
 *   hz: number | null,
 *   sounding: boolean,
 *   level: number,
 *   steady: boolean
 * }} TunerReading
 * note: MIDI number shown; cents off it; sounding: a note is heard right now;
 * steady: the cents come from the lock-in's fit. While the note fades the
 * last cents heard are held.
 */

/**
 * @param {number} sampleRate
 * @param {number} [referenceA] the A the notes are tuned to (Hz)
 */
export function createTunerEngine(sampleRate, referenceA = 440) {
	const ring = new Float32Array(HISTORY);
	const pitchSamples = new Float32Array(PITCH_WINDOW);
	const findPitch = createPitchFinder(PITCH_WINDOW, sampleRate);
	const noteLock = createNoteLock();
	const slopes = Array.from({ length: PARTIALS }, () => createPhaseSlope(FIT_SECONDS));
	let written = 0;
	let blockEnergy = 0;
	let lastBlockRms = 0;

	/** @type {{ note: number, hz: number, window: Float64Array, partials: number[] } | null} */
	let target = null;
	/** @type {number | null} */
	let roughCents = null;
	let heardAt = -Infinity;
	/** The cents last heard, held while the note fades. @type {number | null} */
	let shownCents = null;

	/** @param {number} midi */
	const noteHz = (midi) => referenceA * 2 ** ((midi - 69) / 12);

	/** @param {number | null} note */
	function aimAt(note) {
		if (note === target?.note) return;
		for (const slope of slopes) slope.restart();
		roughCents = null;
		shownCents = null;
		if (note === null) {
			target = null;
			return;
		}
		const hz = noteHz(note);
		const window = lockInWindow(hz, sampleRate, LOCK_IN_SHAPE);
		const partials = [1, 2, 3, 4].slice(0, PARTIALS).filter((n) => n * hz < sampleRate / 2.2);
		target = { note, hz, window, partials };
	}

	function measureLockIn() {
		if (!target) return;
		const time = written / sampleRate;
		const { window, hz, partials } = target;
		if (window.length > Math.min(written, HISTORY)) return;
		// Timed at the window's middle: when the sound was measured
		const measuredAt = time - window.length / 2 / sampleRate;
		for (const partial of partials) {
			const { phase, strength } = measurePhase(ring, written, window, partial * hz, sampleRate);
			slopes[partial - 1].add(measuredAt, phase, strength);
		}
	}

	/** The partials' cents, each weighed by its strength and how finely it shows a cent. */
	function lockInCents() {
		if (!target) return null;
		let sum = 0;
		let weights = 0;
		slopes.forEach((slope, index) => {
			if (slope.span < FIT_NEEDED) return;
			const partial = index + 1;
			const partialHz = partial * /** @type {{ hz: number }} */ (target).hz;
			const cents = 1200 * Math.log2((partialHz + slope.hzOff()) / partialHz);
			const weight = slope.strength * partial * partial;
			sum += cents * weight;
			weights += weight;
		});
		return weights > 0 ? sum / weights : null;
	}

	/** @returns {TunerReading} */
	function read() {
		const rms = Math.sqrt(blockEnergy / PITCH_EVERY);
		blockEnergy = 0;
		const time = written / sampleRate;
		const plucked = rms > SILENCE && rms > lastBlockRms * PLUCK_RISE;
		lastBlockRms = rms;

		const start = written - PITCH_WINDOW;
		for (let i = 0; i < PITCH_WINDOW; i++) pitchSamples[i] = ring[(start + i) & (HISTORY - 1)];
		const found = rms > SILENCE ? findPitch(pitchSamples) : null;
		const midi = found ? 69 + 12 * Math.log2(found.hz / referenceA) : null;

		aimAt(noteLock.update(midi, time));
		if (plucked) for (const slope of slopes) slope.restart();
		if (!target)
			return { note: null, cents: null, hz: null, sounding: false, level: rms, steady: false };

		const off = midi === null ? null : midi - target.note;
		// An octave either way is the same note heard on another partial
		if (off !== null && Math.abs(off - 12 * Math.round(off / 12)) < 1 && Math.abs(off) < 13)
			heardAt = time;
		if (off !== null && Math.abs(off) < 1) roughCents = off * 100;
		const sounding = time - heardAt < STILL_HEARD;
		if (!sounding) for (const slope of slopes) slope.restart();

		let steady = false;
		if (sounding) {
			const fitted = lockInCents();
			steady = fitted !== null && Math.abs(fitted - (roughCents ?? 0)) <= LOCK_IN_AGREES;
			if (fitted !== null && !steady) for (const slope of slopes) slope.restart();
			shownCents = steady ? fitted : roughCents;
		}
		return {
			note: target.note,
			cents: shownCents,
			hz: shownCents === null ? null : target.hz * 2 ** (shownCents / 1200),
			sounding,
			level: rms,
			steady
		};
	}

	return {
		/**
		 * Hand it the next samples (any length); it returns a reading every ~20 ms, else null.
		 * @param {Float32Array} samples
		 * @returns {TunerReading | null}
		 */
		push(samples) {
			/** @type {TunerReading | null} */
			let reading = null;
			for (let i = 0; i < samples.length; i++) {
				ring[written & (HISTORY - 1)] = samples[i];
				blockEnergy += samples[i] * samples[i];
				written++;
				if (written % LOCK_IN_EVERY === 0) measureLockIn();
				if (written % PITCH_EVERY === 0 && written >= PITCH_WINDOW) reading = read();
			}
			return reading;
		}
	};
}
