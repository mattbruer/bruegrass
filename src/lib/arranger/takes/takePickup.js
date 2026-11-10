/**
 * A pickup sung on a take: the band waits for it, as it does for the
 * melody's written pickup. Plain maths, no audio.
 *
 * A take starts a bar or two before bar 1 (the count-in), mostly silence.
 * Only the stretch from where its sound begins counts, so a take without
 * a sung pickup adds no wait. A pickup is sung in the bar before bar 1, so
 * sound earlier than that (click bleed, a breath) never makes the band wait longer.
 */
import { takeStart } from './takeTiming.js';

/** Sound this far below the take's loudest moment is taken as silence (dB). */
const SILENCE_BELOW_PEAK_DB = 36;
/** Start this much before the first sound, for a breath or a soft consonant (seconds). */
const BEFORE_FIRST_SOUND = 0.1;

/**
 * How far into a take its sound begins (seconds).
 * @param {Float32Array} samples
 * @param {number} sampleRate
 */
export function firstSound(samples, sampleRate) {
	let peak = 0;
	for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
	if (peak === 0) return samples.length / sampleRate;
	const threshold = peak * 10 ** (-SILENCE_BELOW_PEAK_DB / 20);
	const index = samples.findIndex((sample) => Math.abs(sample) >= threshold);
	return index / sampleRate;
}

/**
 * How long before bar 1 the band should start, for the earliest sung pickup
 * among these takes (0: none starts before bar 1), at most one bar.
 * @param {(import('./takeTiming.js').Placed & { soundFrom: number })[]} takes
 *   soundFrom: from firstSound()
 * @param {number} barSeconds the length of bar 1
 */
export function sungPickup(takes, barSeconds) {
	let lead = 0;
	for (const take of takes) {
		const soundStarts = takeStart(take) + take.soundFrom - BEFORE_FIRST_SOUND;
		lead = Math.max(lead, -soundStarts);
	}
	return Math.min(lead, barSeconds);
}
