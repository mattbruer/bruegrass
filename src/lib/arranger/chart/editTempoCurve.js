/**
 * Changing the tempo lane's points: each edit gives back a new list, in
 * order, with one point to a place.
 */
import { TEMPO_SHARE_MAX, TEMPO_SHARE_MIN } from './tempoCurve.js';

/** @typedef {import('./tempoCurve.js').TempoPoint} TempoPoint */

/**
 * A share of the song's tempo that comes out as a whole BPM, within the lane.
 * @param {number} share
 * @param {number} bpm the song's tempo
 */
export function wholeBpmShare(share, bpm) {
	const kept = Math.min(TEMPO_SHARE_MAX, Math.max(TEMPO_SHARE_MIN, share));
	return Math.round(kept * bpm) / bpm;
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
