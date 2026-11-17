/**
 * The tempo of the bars around each moment, from a first run of beats: at
 * every frame, the usual gap (the median) of the beats near it. A band
 * drifts slowly, so tracking again against this lets the tempo drift but
 * not jump: a beat finder that loses its place shows up as a jump.
 */

/** How many beats either side make up "the bars around" a moment. */
export const NEARBY_BEATS = 16;

/**
 * @param {number[]} frames beats from a first run, in frames
 * @param {number} length frames in the recording
 * @returns {Float32Array} the expected gap at every frame
 */
export function localGaps(frames, length) {
	const gaps = frames.slice(1).map((frame, i) => frame - frames[i]);
	const local = gaps.map((_, i) =>
		median(gaps.slice(Math.max(0, i - NEARBY_BEATS), i + NEARBY_BEATS + 1))
	);
	const middles = gaps.map((_, i) => (frames[i] + frames[i + 1]) / 2);

	const expected = new Float32Array(length);
	let i = 0;
	for (let t = 0; t < length; t++) {
		while (i < middles.length - 1 && middles[i + 1] <= t) i++;
		expected[t] = between(middles, local, i, t);
	}
	return expected;
}

/**
 * The local gap at frame t, straight-line between the two nearest gaps' middles.
 * @param {number[]} middles
 * @param {number[]} local
 * @param {number} i the last middle at or before t (or the first)
 * @param {number} t
 */
function between(middles, local, i, t) {
	if (t <= middles[0] || i >= middles.length - 1) return local[Math.min(i, local.length - 1)];
	const along = (t - middles[i]) / (middles[i + 1] - middles[i]);
	return local[i] + along * (local[i + 1] - local[i]);
}

/** @param {number[]} values */
function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}
