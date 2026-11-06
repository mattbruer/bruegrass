/**
 * The note a take actually sounds, to compare with the note asked for:
 * the YIN method (de Cheveigné & Kawahara, 2002), which finds the period
 * at which the wave best repeats itself.
 *
 * It only looks within half an octave of the expected note. That avoids
 * YIN's usual mistake (an octave too high or low, common on a low E with a
 * strong second harmonic), and anything further off is a wrong string or
 * fret, which the check reports anyway.
 */

/** Measured this long after the pick lands (ms): past the attack's slight sharpness. */
const MEASURE_AFTER_MS = [100, 200, 300];
/** How far from the expected note to look, in semitones either way. */
const SEARCH_SEMITONES = 6;
/** YIN's threshold: the first dip below this is the period. */
const YIN_THRESHOLD = 0.15;
/** Samples compared at each trial period. */
const WINDOW = 2048;

/**
 * @param {Float32Array} samples one channel (the main mic)
 * @param {number} sampleRate
 * @param {number} onset frame where the hit starts
 * @param {number} expectedHz
 * @returns {number | null} Hz, or null when it can't tell (too short, no clear pitch)
 */
export function detectPitch(samples, sampleRate, onset, expectedHz) {
	const minLag = Math.floor(sampleRate / (expectedHz * 2 ** (SEARCH_SEMITONES / 12)));
	const maxLag = Math.ceil(sampleRate / (expectedHz * 2 ** (-SEARCH_SEMITONES / 12)));

	const readings = MEASURE_AFTER_MS.map((ms) => {
		const from = onset + Math.round((sampleRate * ms) / 1000);
		if (from + WINDOW + maxLag > samples.length) return null;
		const lag = yinPeriod(samples, from, minLag, maxLag);
		return lag ? sampleRate / lag : null;
	}).filter((hz) => hz !== null);

	if (readings.length === 0) return null;
	readings.sort((a, b) => a - b);
	return readings[Math.floor(readings.length / 2)];
}

/**
 * Cents from `expectedHz` to `hz` (+ sharp, − flat).
 * @param {number} hz
 * @param {number} expectedHz
 */
export function centsOff(hz, expectedHz) {
	return 1200 * Math.log2(hz / expectedHz);
}

/** @param {number} midi */
export function midiToHz(midi) {
	return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * @param {Float32Array} samples
 * @param {number} from
 * @param {number} minLag
 * @param {number} maxLag
 * @returns {number | null} the period in samples (fractional)
 */
function yinPeriod(samples, from, minLag, maxLag) {
	// Difference at each lag, normalised by its running mean (YIN steps 2–3)
	const normalised = new Float32Array(maxLag + 2);
	normalised[0] = 1;
	let runningSum = 0;
	for (let lag = 1; lag <= maxLag + 1; lag++) {
		let difference = 0;
		for (let i = 0; i < WINDOW; i++) {
			const delta = samples[from + i] - samples[from + i + lag];
			difference += delta * delta;
		}
		runningSum += difference;
		normalised[lag] = runningSum > 0 ? (difference * lag) / runningSum : 1;
	}

	// The first dip under the threshold, followed to its bottom; else the deepest dip
	let best = -1;
	for (let lag = minLag; lag <= maxLag; lag++) {
		if (normalised[lag] < YIN_THRESHOLD) {
			while (lag + 1 <= maxLag && normalised[lag + 1] < normalised[lag]) lag++;
			best = lag;
			break;
		}
	}
	if (best < 0) {
		best = minLag;
		for (let lag = minLag; lag <= maxLag; lag++) {
			if (normalised[lag] < normalised[best]) best = lag;
		}
		if (normalised[best] > 0.5) return null; // nothing repeats: no clear pitch
	}

	// Between samples: fit a parabola through the dip and its neighbours
	const before = normalised[best - 1];
	const at = normalised[best];
	const after = normalised[best + 1];
	const curve = before - 2 * at + after;
	return curve > 0 ? best + (before - after) / (2 * curve) : best;
}
