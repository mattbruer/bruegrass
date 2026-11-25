/**
 * Where one recording of a sound sits inside another recording of the
 * same sound: e.g. the full-quality take inside the camera file's
 * compressed sound, both from the same mic. Their loudness envelopes are
 * slid past each other over the whole span it could be in, and the best
 * match wins: coarsely first, then finely around the best. The whole
 * reference is matched, because music repeats (beats, bars) but a whole
 * performance's ups and downs don't, so only the true place fits.
 * Accurate to about a millisecond, far finer than a video frame.
 */

/** Envelope steps (seconds): the coarse search, then the fine one around its best. */
const COARSE_STEP = 0.01;
const FINE_STEP = 0.001;

/**
 * @param {Float32Array} reference the sound to look for
 * @param {Float32Array} other the recording to look in
 * @param {number} sampleRate both signals' (resample first if they differ)
 * @param {{ from: number, to: number }} span seconds into `other` the reference could start
 * @returns {number | null} seconds into `other` where `reference` starts (null: no clear
 *   match, e.g. silence)
 */
export function findOffset(reference, other, sampleRate, { from, to }) {
	const coarse = bestLag(reference, other, sampleRate, COARSE_STEP, from, to);
	if (coarse === null) return null;
	return bestLag(
		reference,
		other,
		sampleRate,
		FINE_STEP,
		coarse - COARSE_STEP,
		coarse + COARSE_STEP
	);
}

/**
 * @param {Float32Array} reference
 * @param {Float32Array} other
 * @param {number} sampleRate
 * @param {number} step seconds per envelope step
 * @param {number} from seconds
 * @param {number} to seconds
 */
function bestLag(reference, other, sampleRate, step, from, to) {
	const samplesPerStep = Math.max(1, Math.round(sampleRate * step));
	const ref = envelope(reference, samplesPerStep);
	const look = envelope(other, samplesPerStep);
	let best = { lag: NaN, score: 0 };
	for (let lag = Math.floor(from / step); lag <= Math.ceil(to / step); lag++) {
		const score = correlation(ref, look, lag);
		if (score > best.score) best = { lag, score };
	}
	return Number.isFinite(best.lag) ? best.lag * step : null;
}

/**
 * Mean loudness per step, minus its average (so the match is on changes, not level).
 * @param {Float32Array} signal
 * @param {number} samplesPerStep
 */
function envelope(signal, samplesPerStep) {
	const steps = Math.floor(signal.length / samplesPerStep);
	const out = new Float32Array(steps);
	for (let step = 0; step < steps; step++) {
		let sum = 0;
		for (let i = step * samplesPerStep, end = i + samplesPerStep; i < end; i++)
			sum += Math.abs(signal[i]);
		out[step] = sum / samplesPerStep;
	}
	const mean = out.reduce((total, value) => total + value, 0) / (steps || 1);
	for (let step = 0; step < steps; step++) out[step] -= mean;
	return out;
}

/**
 * Normalised correlation of `ref` with `look` starting at `lag` (only the overlap counts).
 * @param {Float32Array} ref
 * @param {Float32Array} look
 * @param {number} lag
 */
function correlation(ref, look, lag) {
	let product = 0;
	let refEnergy = 0;
	let lookEnergy = 0;
	for (let i = Math.max(0, -lag); i < ref.length && i + lag < look.length; i++) {
		const a = ref[i];
		const b = look[i + lag];
		product += a * b;
		refEnergy += a * a;
		lookEnergy += b * b;
	}
	return refEnergy && lookEnergy ? product / Math.sqrt(refEnergy * lookEnergy) : 0;
}
