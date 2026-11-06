/**
 * Cut a take down to its sample: the trim found when it was recorded, with
 * the lead-in faded up and the tail faded out, so it starts and stops
 * without a click. The level is left alone: normalising each sample would
 * erase the difference between a hard and a soft hit.
 */
import { LEAD_IN_MS } from '../analysis/findHit.js';

/** The tail's fade, in ms. */
const FADE_OUT_MS = 20;

/**
 * @param {Float32Array[]} channels the whole take
 * @param {{ start: number, end: number }} trim frames
 * @param {number} sampleRate
 * @returns {Float32Array[]} new arrays (the take is untouched)
 */
export function cutSample(channels, trim, sampleRate) {
	const fadeIn = Math.round((sampleRate * LEAD_IN_MS) / 1000);
	const fadeOut = Math.round((sampleRate * FADE_OUT_MS) / 1000);
	return channels.map((channel) => {
		const sample = channel.slice(trim.start, trim.end);
		const length = sample.length;
		for (let i = 0; i < Math.min(fadeIn, length); i++) sample[i] *= i / fadeIn;
		for (let i = 0; i < Math.min(fadeOut, length); i++) sample[length - 1 - i] *= i / fadeOut;
		return sample;
	});
}
