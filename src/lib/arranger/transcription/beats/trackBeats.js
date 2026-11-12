/**
 * Where every beat falls: the run of beats that lands on the strongest
 * onsets while keeping each gap close to the usual one (dynamic
 * programming, after Ellis, "Beat tracking by dynamic programming", 2007).
 * Each gap is only compared with the usual gap, so the beats can drift
 * with a song that speeds up or drags.
 */

/** How strictly each gap keeps to the usual one. Lower follows tempo changes more freely. */
const TIGHTNESS = 100;

/**
 * @param {Float32Array} strength from analyseRecording
 * @param {number} beatFrames the usual gap, from estimateBeatFrames
 * @returns {number[]} beat positions, in frames, in order
 */
export function trackBeats(strength, beatFrames) {
	const length = strength.length;
	const score = new Float64Array(length);
	const previous = new Int32Array(length).fill(-1);
	const nearest = Math.max(1, Math.round(beatFrames / 2));
	const farthest = Math.round(beatFrames * 2);

	for (let t = 0; t < length; t++) {
		let best = 0;
		for (let back = nearest; back <= farthest && back <= t; back++) {
			const gap = Math.log(back / beatFrames);
			const candidate = score[t - back] - TIGHTNESS * gap * gap;
			if (candidate > best) {
				best = candidate;
				previous[t] = t - back;
			}
		}
		score[t] = strength[t] + best;
	}

	return backtrack(previous, lastBeat(score, beatFrames));
}

/**
 * The best-scoring frame within the last beat's length of the end.
 * @param {Float64Array} score
 * @param {number} beatFrames
 */
function lastBeat(score, beatFrames) {
	let best = score.length - 1;
	for (let t = Math.max(0, score.length - Math.round(beatFrames)); t < score.length; t++) {
		if (score[t] > score[best]) best = t;
	}
	return best;
}

/**
 * @param {Int32Array} previous
 * @param {number} last
 */
function backtrack(previous, last) {
	const beats = [];
	for (let t = last; t >= 0; t = previous[t]) beats.push(t);
	return beats.reverse();
}
