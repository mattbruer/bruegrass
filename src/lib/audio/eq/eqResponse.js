/**
 * What an EQ does to each frequency, in dB, worked out on paper rather than
 * by asking the audio engine, so the curve can be drawn before any audio
 * exists (and tested anywhere).
 *
 * Each band is a "biquad" filter, the same kind Web Audio's
 * BiquadFilterNode uses, with the coefficients from Robert
 * Bristow-Johnson's "Audio EQ Cookbook" (which the Web Audio spec follows).
 * Filters in a row multiply, so in dB their responses add up.
 */
import { bandDefinition, isCut } from './eqBands.js';

/** The cuts are smooth (Butterworth): no bump at the corner. */
export const BUTTERWORTH_Q = Math.SQRT1_2;

/**
 * The whole EQ's response at each frequency, in dB.
 * @param {import('./eqBands.js').EqSettings} eq
 * @param {number[]} frequencies Hz
 * @param {number} sampleRate
 */
export function eqResponseDb(eq, frequencies, sampleRate) {
	const total = frequencies.map(() => 0);
	if (!eq.enabled) return total;

	for (const band of eq.bands) {
		if (!band.on) continue;
		const response = bandResponseDb(band, frequencies, sampleRate);
		response.forEach((db, i) => (total[i] += db));
	}
	return total;
}

/**
 * One band's response at each frequency, in dB.
 * @param {import('./eqBands.js').BandSettings} band
 * @param {number[]} frequencies
 * @param {number} sampleRate
 */
export function bandResponseDb(band, frequencies, sampleRate) {
	const { shape } = bandDefinition(band.id);
	const coefficients = biquadCoefficients(shape, band, sampleRate);
	const stages = isCut(shape) ? band.slope / 12 : 1; // a 24 dB/oct cut is two filters in a row
	return frequencies.map((hz) => stages * magnitudeDb(coefficients, hz, sampleRate));
}

/**
 * @param {import('./eqBands.js').BandShape} shape
 * @param {import('./eqBands.js').BandSettings} band
 * @param {number} sampleRate
 */
function biquadCoefficients(shape, { frequency, gain, q }, sampleRate) {
	const w0 = (2 * Math.PI * frequency) / sampleRate;
	const cos = Math.cos(w0);
	const sin = Math.sin(w0);
	const A = 10 ** (gain / 40); // amplitude for half the gain: shelves and bells split it

	if (shape === 'highpass' || shape === 'lowpass') {
		const alpha = sin / (2 * BUTTERWORTH_Q);
		const passing = shape === 'highpass' ? (1 + cos) / 2 : (1 - cos) / 2;
		const middle = shape === 'highpass' ? -(1 + cos) : 1 - cos;
		return { b: [passing, middle, passing], a: [1 + alpha, -2 * cos, 1 - alpha] };
	}

	if (shape === 'peaking') {
		const alpha = sin / (2 * q);
		return {
			b: [1 + alpha * A, -2 * cos, 1 - alpha * A],
			a: [1 + alpha / A, -2 * cos, 1 - alpha / A]
		};
	}

	// Shelves: Web Audio uses a fixed slope (S = 1), whatever the Q
	const alpha = (sin / 2) * Math.SQRT2;
	const twoRootAAlpha = 2 * Math.sqrt(A) * alpha;
	if (shape === 'lowshelf') {
		return {
			b: [
				A * (A + 1 - (A - 1) * cos + twoRootAAlpha),
				2 * A * (A - 1 - (A + 1) * cos),
				A * (A + 1 - (A - 1) * cos - twoRootAAlpha)
			],
			a: [
				A + 1 + (A - 1) * cos + twoRootAAlpha,
				-2 * (A - 1 + (A + 1) * cos),
				A + 1 + (A - 1) * cos - twoRootAAlpha
			]
		};
	}
	return {
		b: [
			A * (A + 1 + (A - 1) * cos + twoRootAAlpha),
			-2 * A * (A - 1 + (A + 1) * cos),
			A * (A + 1 + (A - 1) * cos - twoRootAAlpha)
		],
		a: [
			A + 1 - (A - 1) * cos + twoRootAAlpha,
			2 * (A - 1 - (A + 1) * cos),
			A + 1 - (A - 1) * cos - twoRootAAlpha
		]
	};
}

/**
 * How much a biquad boosts or cuts one frequency, in dB.
 * @param {{ b: number[], a: number[] }} coefficients
 * @param {number} hz
 * @param {number} sampleRate
 */
function magnitudeDb({ b, a }, hz, sampleRate) {
	const w = (2 * Math.PI * hz) / sampleRate;
	const numerator = complexMagnitude(
		b[0] + b[1] * Math.cos(w) + b[2] * Math.cos(2 * w),
		b[1] * Math.sin(w) + b[2] * Math.sin(2 * w)
	);
	const denominator = complexMagnitude(
		a[0] + a[1] * Math.cos(w) + a[2] * Math.cos(2 * w),
		a[1] * Math.sin(w) + a[2] * Math.sin(2 * w)
	);
	return 20 * Math.log10(numerator / denominator);
}

/** @param {number} real @param {number} imaginary */
function complexMagnitude(real, imaginary) {
	return Math.hypot(real, imaginary);
}
