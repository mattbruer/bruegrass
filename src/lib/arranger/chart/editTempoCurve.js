/**
 * Changing the tempo lane's points: each edit gives back a new list, in
 * order, with one point to a place.
 */
/** @typedef {import('./tempoCurve.js').TempoPoint} TempoPoint */

const SLOWEST_BPM = 1; // the band has to keep moving
const USUAL_RANGE = { low: 0.5, high: 1.5 }; // the lane's span before any point goes past it
const HEADROOM = 0.25; // room past the furthest point, so it can be dragged further

/**
 * A share of the song's tempo that comes out as a whole BPM.
 * @param {number} share
 * @param {number} bpm the song's tempo
 */
export function wholeBpmShare(share, bpm) {
	return Math.max(SLOWEST_BPM, Math.round(share * bpm)) / bpm;
}

/**
 * The span of tempos the lane shows, as shares of the song's tempo: the
 * usual span, widened to take in every point with room to go further.
 * @param {TempoPoint[]} points
 */
export function laneRange(points) {
	const shares = points.map((point) => point.share);
	return {
		low: Math.min(USUAL_RANGE.low, ...shares.map((share) => share * (1 - HEADROOM))),
		high: Math.max(USUAL_RANGE.high, ...shares.map((share) => share * (1 + HEADROOM)))
	};
}

/**
 * @param {TempoPoint[]} points
 * @param {TempoPoint} point replaces one already at that place
 * @returns {{ points: TempoPoint[], index: number }} index: where it went
 */
export function withPoint(points, point) {
	const kept = points.filter((each) => each.at !== point.at);
	const index = kept.findIndex((each) => each.at > point.at);
	const at = index === -1 ? kept.length : index;
	return { points: [...kept.slice(0, at), point, ...kept.slice(at)], index: at };
}

/**
 * Move a point, never past its neighbours (Logic's way: points keep their order).
 * @param {TempoPoint[]} points
 * @param {number} index
 * @param {TempoPoint} to
 * @param {number} step the smallest move across, in quarters
 */
export function movedPoint(points, index, to, step) {
	const before = points[index - 1]?.at ?? -Infinity;
	const after = points[index + 1]?.at ?? Infinity;
	const at = Math.min(after - step, Math.max(before + step, Math.max(0, to.at)));
	return points.map((point, i) => (i === index ? { at, share: to.share } : point));
}

/**
 * @param {TempoPoint[]} points
 * @param {number} index
 */
export function withoutPoint(points, index) {
	return points.filter((_, i) => i !== index);
}
