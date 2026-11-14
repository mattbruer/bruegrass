/**
 * Where a sample's sound begins, in seconds: the samples are MP3s, which
 * start with the encoder's silence (about 23 ms), so the pick lands after it.
 */

/** The sound has begun at this share of the sample's peak. */
const START_SHARE = 0.05;

/** @type {WeakMap<object, number>} */
const measured = new WeakMap();

/** @param {{ getChannelData: (channel: number) => Float32Array, sampleRate: number }} buffer */
export function soundStart(buffer) {
	let start = measured.get(buffer);
	if (start === undefined) {
		const data = buffer.getChannelData(0);
		let peak = 0;
		for (const sample of data) peak = Math.max(peak, Math.abs(sample));
		const index = data.findIndex((sample) => Math.abs(sample) >= peak * START_SHARE);
		start = Math.max(0, index) / buffer.sampleRate;
		measured.set(buffer, start);
	}
	return start;
}
