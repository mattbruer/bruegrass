/**
 * How far a recording's notes sit from standard pitch (A = 440), in cents:
 * the strong partials across the song, each one's distance from the
 * nearest note, averaged round the circle (49 cents sharp is next to 49
 * flat). Instruments' partials stretch a little and voices slide, so it's a
 * starting point to nudge from by ear.
 *
 * Well between two notes, 39¢ flat sounds the same as 61¢ sharp: the notes
 * themselves say which, by which way lands in a key the caller expects.
 */
import { createFft } from '../audio/stretch/fft.js';

/** Long frames: fine enough to tell a few cents apart. */
const FRAME_SIZE = 16384;
const FRAMES = 60;
/** Partials in this range: above the bass's rumble, below where they stretch most. */
const LOWEST_HZ = 150;
const HIGHEST_HZ = 2000;
/** A peak counts when it's this close to the frame's loudest (−26 dB). */
const PEAK_SHARE = 0.05;
/** Frames quieter than this (RMS) are skipped. */
const SILENCE = 0.003;
/** Closer to a note than this, the nearest note is trusted. */
const OTHER_WAY_FROM = 25;
/** The other way has to fit the keys this much better (0 to 1): when both fit, the smaller move wins. */
const CLEARLY_BETTER = 0.1;

/**
 * @typedef {{ cents: number[], weights: number[] }} Partials
 *   each partial's pitch in cents from A = 440, and how loud it is
 */

/**
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @param {(noteWeights: number[]) => number} keyFit how well 12 note weights (C first) fit the keys expected
 * @returns {{ cents: number, otherWay: number | null } | null}
 *   cents the recording is sharp (positive) or flat, within a semitone, and
 *   the reading the other way when it's between two notes; null: no notes found
 */
export function findTuning(channels, sampleRate, keyFit) {
	const partials = hearPartials(channels, sampleRate);
	const nearest = offNearestNote(partials);
	if (nearest === null) return null;
	if (Math.abs(nearest) < OTHER_WAY_FROM) return { cents: nearest, otherWay: null };
	const otherWay = nearest - 100 * Math.sign(nearest);
	const fits = (/** @type {number} */ off) => keyFit(noteWeights(partials, off));
	return fits(otherWay) > fits(nearest) + CLEARLY_BETTER
		? { cents: otherWay, otherWay: nearest }
		: { cents: nearest, otherWay };
}

/**
 * The strong partials in 60 frames across the song.
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {Partials}
 */
function hearPartials(channels, sampleRate) {
	const fft = createFft(FRAME_SIZE);
	const length = channels[0].length;
	const re = new Float64Array(FRAME_SIZE);
	const im = new Float64Array(FRAME_SIZE);
	const magnitude = new Float64Array(FRAME_SIZE / 2);
	const lowBin = Math.ceil((LOWEST_HZ * FRAME_SIZE) / sampleRate);
	const highBin = Math.floor((HIGHEST_HZ * FRAME_SIZE) / sampleRate);
	/** @type {Partials} */
	const partials = { cents: [], weights: [] };

	for (let f = 0; f < FRAMES; f++) {
		const start = Math.floor(((f + 0.5) / FRAMES) * (length - FRAME_SIZE));
		if (start < 0 || !fillFrame(channels, start, re, im)) continue;
		fft.forward(re, im);
		let loudest = 0;
		for (let k = lowBin; k <= highBin; k++) {
			magnitude[k] = Math.hypot(re[k], im[k]);
			loudest = Math.max(loudest, magnitude[k]);
		}
		for (let k = lowBin + 1; k < highBin; k++) {
			const m = magnitude[k];
			if (m < loudest * PEAK_SHARE || m < magnitude[k - 1] || m <= magnitude[k + 1]) continue;
			const hz = ((k + peakOffset(magnitude, k)) * sampleRate) / FRAME_SIZE;
			partials.cents.push(1200 * Math.log2(hz / 440));
			partials.weights.push(m);
		}
	}
	return partials;
}

/**
 * The partials' distance from the nearest note (−50 to 50), averaged round the circle.
 * @param {Partials} partials
 */
function offNearestNote({ cents, weights }) {
	let x = 0;
	let y = 0;
	cents.forEach((pitch, i) => {
		const angle = (2 * Math.PI * pitch) / 100;
		x += weights[i] * Math.cos(angle);
		y += weights[i] * Math.sin(angle);
	});
	if (x === 0 && y === 0) return null;
	return (Math.atan2(y, x) * 100) / (2 * Math.PI);
}

/**
 * How loud each of the 12 notes is (C first), heard as if tuned by `off`.
 * @param {Partials} partials
 * @param {number} off cents sharp
 */
function noteWeights({ cents, weights }, off) {
	const notes = new Array(12).fill(0);
	cents.forEach((pitch, i) => {
		const fromA = Math.round((pitch - off) / 100);
		notes[(((fromA + 9) % 12) + 12) % 12] += weights[i];
	});
	return notes;
}

/**
 * A Hann-windowed mono frame; false when it's silent.
 * @param {Float32Array[]} channels
 * @param {number} start
 * @param {Float64Array} re
 * @param {Float64Array} im
 */
function fillFrame(channels, start, re, im) {
	let power = 0;
	for (let i = 0; i < FRAME_SIZE; i++) {
		let sample = 0;
		for (const channel of channels) sample += channel[start + i];
		sample /= channels.length;
		power += sample * sample;
		re[i] = sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME_SIZE));
		im[i] = 0;
	}
	return Math.sqrt(power / FRAME_SIZE) > SILENCE;
}

/**
 * Where between bins the peak really is (a parabola through the log magnitudes).
 * @param {Float64Array} magnitude
 * @param {number} k
 */
function peakOffset(magnitude, k) {
	const a = Math.log(magnitude[k - 1] + 1e-12);
	const b = Math.log(magnitude[k] + 1e-12);
	const c = Math.log(magnitude[k + 1] + 1e-12);
	const bend = a - 2 * b + c;
	return bend === 0 ? 0 : (0.5 * (a - c)) / bend;
}
