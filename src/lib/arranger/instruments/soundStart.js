/**
 * Where a sample's note is struck, in seconds. Every MP3 starts with the
 * encoder's silence (about 23 ms; browsers decode it differently), and some
 * recordings have a quiet scrape of the pick before the string really sounds
 * (ee8, the high e's 8th fret, about 35 ms of it). Both are passed over:
 * the strike is where the sound first reaches a fifth of the sample's peak.
 * Measured here, as each sample loads, so new samples need nothing.
 */

/** The note has been struck at this share of the sample's peak (a scrape stays under it). */
const STRIKE_SHARE = 0.2;

/** @type {WeakMap<object, number>} */
const measured = new WeakMap();

/** @param {{ getChannelData: (channel: number) => Float32Array, sampleRate: number }} buffer */
export function soundStart(buffer) {
	let start = measured.get(buffer);
	if (start === undefined) {
		const data = buffer.getChannelData(0);
		let peak = 0;
		for (const sample of data) peak = Math.max(peak, Math.abs(sample));
		const index = data.findIndex((sample) => Math.abs(sample) >= peak * STRIKE_SHARE);
		start = Math.max(0, index) / buffer.sampleRate;
		measured.set(buffer, start);
	}
	return start;
}
