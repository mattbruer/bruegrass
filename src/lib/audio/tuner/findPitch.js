/**
 * Which note is sounding: the McLeod pitch method (McLeod & Wyvill, "A
 * smarter way to find pitch", 2005). It compares the sound with itself a
 * little later (the normalised square difference, NSDF, worked out by FFT)
 * and takes the first delay at which it nearly repeats as the period. Taking
 * the first good repeat rather than the best one is what keeps it off the
 * wrong octave.
 *
 * This only finds the note and a rough pitch; the fine cents come from
 * lockIn.js, which measures against the note's own frequency.
 */
import { createFft } from '../stretch/fft.js';

/** The first repeat at least this good, against the best one (the paper's k). */
const FIRST_GOOD_REPEAT = 0.9;
/** Below this the sound doesn't repeat enough to be a note (noise, a knock, speech). */
const CLARITY_NEEDED = 0.8;
const HIGHEST_HZ = 2000;

/**
 * @param {number} windowSize samples looked at each time (a power of two)
 * @param {number} sampleRate
 * @returns {(samples: Float32Array) => { hz: number, clarity: number } | null}
 */
export function createPitchFinder(windowSize, sampleRate) {
	const fft = createFft(windowSize * 2);
	const re = new Float64Array(windowSize * 2);
	const im = new Float64Array(windowSize * 2);
	const nsdf = new Float64Array(windowSize / 2);
	const shortestLag = Math.floor(sampleRate / HIGHEST_HZ);

	return function findPitch(samples) {
		const mean = average(samples);
		re.fill(0);
		im.fill(0);
		for (let i = 0; i < windowSize; i++) re[i] = samples[i] - mean;

		// Autocorrelation by FFT: |X|², then back
		fft.forward(re, im);
		for (let i = 0; i < re.length; i++) {
			re[i] = re[i] * re[i] + im[i] * im[i];
			im[i] = 0;
		}
		fft.inverse(re, im);

		fillNsdf(nsdf, re, samples, mean);
		const lag = firstGoodRepeat(nsdf, shortestLag);
		if (lag === null) return null;
		const { at, height } = peakBetweenSamples(nsdf, lag);
		if (height < CLARITY_NEEDED) return null;
		return { hz: sampleRate / at, clarity: Math.min(1, height) };
	};
}

/**
 * NSDF at each lag: 2 × autocorrelation ÷ the energy of both overlapping parts.
 * @param {Float64Array} nsdf
 * @param {Float64Array} autocorrelation
 * @param {Float32Array} samples
 * @param {number} mean
 */
function fillNsdf(nsdf, autocorrelation, samples, mean) {
	const n = samples.length;
	let energy = 0;
	for (let i = 0; i < n; i++) energy += (samples[i] - mean) ** 2;
	energy *= 2;
	for (let lag = 0; lag < nsdf.length; lag++) {
		nsdf[lag] = energy > 0 ? (2 * autocorrelation[lag]) / energy : 0;
		energy -= (samples[lag] - mean) ** 2 + (samples[n - 1 - lag] - mean) ** 2;
	}
}

/**
 * The highest point of each stretch above zero is a "key maximum"; the
 * period is the first one close to the best of them.
 * @param {Float64Array} nsdf
 * @param {number} shortestLag
 */
function firstGoodRepeat(nsdf, shortestLag) {
	/** @type {number[]} */
	const keyMaxima = [];
	let lag = 1;
	while (lag < nsdf.length && nsdf[lag] > 0) lag++; // past the peak at zero delay
	while (lag < nsdf.length) {
		while (lag < nsdf.length && nsdf[lag] <= 0) lag++;
		let best = -1;
		while (lag < nsdf.length && nsdf[lag] > 0) {
			if (lag >= shortestLag && (best < 0 || nsdf[lag] > nsdf[best])) best = lag;
			lag++;
		}
		// A stretch still rising at the end of the window isn't a whole peak
		if (best > 0 && best < nsdf.length - 1) keyMaxima.push(best);
	}
	if (keyMaxima.length === 0) return null;
	const highest = Math.max(...keyMaxima.map((at) => nsdf[at]));
	return keyMaxima.find((at) => nsdf[at] >= FIRST_GOOD_REPEAT * highest) ?? null;
}

/**
 * A parabola through the peak and its neighbours: where it really peaks, between samples.
 * @param {Float64Array} values
 * @param {number} at
 */
function peakBetweenSamples(values, at) {
	const before = values[at - 1];
	const here = values[at];
	const after = values[at + 1];
	const curve = before - 2 * here + after;
	if (curve >= 0) return { at, height: here };
	const shift = (before - after) / (2 * curve);
	return { at: at + shift, height: here - (curve * shift * shift) / 2 };
}

/** @param {Float32Array} samples */
function average(samples) {
	let sum = 0;
	for (let i = 0; i < samples.length; i++) sum += samples[i];
	return sum / samples.length;
}
