/**
 * Where every beat falls: the run of beats that lands on the strongest
 * onsets while keeping each gap close to the gap expected there (dynamic
 * programming, after Ellis, "Beat tracking by dynamic programming", 2007).
 * The expected gap is given frame by frame, so it can be one tempo for the
 * whole song or the tempo of the bars around each moment (localTempo.js).
 */

/** How strictly each gap keeps to the expected one, when nothing else is said. */
export const LOOSE = 100;

/**
 * Beats that run through a beat you've placed by hand: tracked forward
 * from it and backward from it, so it is one of them exactly.
 * @param {Float32Array} strength
 * @param {Float32Array} expectedGaps the gap expected at each frame, in frames
 * @param {number} anchor the frame of the beat that must be there
 * @param {number} tightness how strictly each gap keeps to the expected one
 * @returns {{ frames: number[], anchorIndex: number }} the beats (frames) and which one is the anchor
 */
export function trackBeatsThrough(strength, expectedGaps, anchor, tightness = LOOSE) {
	const forward = track(strength.subarray(anchor), expectedGaps.subarray(anchor), tightness).map(
		(frame) => anchor + frame
	);
	const backward = track(
		strength.slice(0, anchor + 1).reverse(),
		expectedGaps.slice(0, anchor + 1).reverse(),
		tightness
	)
		.map((frame) => anchor - frame)
		.reverse();
	return { frames: [...backward.slice(0, -1), ...forward], anchorIndex: backward.length - 1 };
}

/**
 * The same gap expected everywhere.
 * @param {number} length frames
 * @param {number} beatFrames
 */
export function evenGaps(length, beatFrames) {
	return new Float32Array(length).fill(beatFrames);
}

/**
 * Beats from the first frame on.
 * @param {Float32Array} strength
 * @param {Float32Array} expectedGaps
 * @param {number} tightness
 */
function track(strength, expectedGaps, tightness) {
	const length = strength.length;
	if (length === 0) return [];
	const score = new Float64Array(length);
	const previous = new Int32Array(length).fill(-1);

	score[0] = strength[0];
	for (let t = 1; t < length; t++) {
		const expected = expectedGaps[t];
		const nearest = Math.max(1, Math.round(expected / 2));
		const farthest = Math.round(expected * 2);
		let best = -Infinity;
		for (let back = nearest; back <= farthest && back <= t; back++) {
			const gap = Math.log(back / expected);
			const candidate = score[t - back] - tightness * gap * gap;
			if (candidate > best) {
				best = candidate;
				previous[t] = t - back;
			}
		}
		score[t] = best > -Infinity ? strength[t] + best : -Infinity;
	}

	const last = lastBeat(score, expectedGaps[length - 1]);
	return score[last] === -Infinity ? [0] : backtrack(previous, last);
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
