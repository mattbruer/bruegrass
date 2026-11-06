/**
 * A take's loudness over time: the loudest channel's RMS in short windows,
 * in dB. The trim, the double-hit check and the cut-off check all read it,
 * so they agree on what "loud" means.
 */
import { toDecibels } from '$lib/arranger/playback/analysis/levels.js';

/** Window length in milliseconds: short enough to catch a pick, long enough to smooth a low E's cycles. */
export const ENVELOPE_WINDOW_MS = 5;

/**
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {{ db: Float32Array, frames: number }} db per window; frames per window
 */
export function loudnessEnvelope(channels, sampleRate) {
	const frames = Math.max(1, Math.round((sampleRate * ENVELOPE_WINDOW_MS) / 1000));
	const length = channels[0]?.length ?? 0;
	const db = new Float32Array(Math.ceil(length / frames));
	for (let window = 0; window < db.length; window++) {
		const from = window * frames;
		const to = Math.min(length, from + frames);
		let loudest = 0;
		for (const channel of channels) {
			let sum = 0;
			for (let i = from; i < to; i++) sum += channel[i] * channel[i];
			loudest = Math.max(loudest, Math.sqrt(sum / Math.max(1, to - from)));
		}
		db[window] = toDecibels(loudest);
	}
	return { db, frames };
}
