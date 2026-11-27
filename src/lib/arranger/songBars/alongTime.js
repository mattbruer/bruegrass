/**
 * Where things on the song's time go when bars are taken out or put in:
 * a place (quarters from bar 1) before stays, one after moves by the bars'
 * length, one inside bars taken out goes (null). Used for whatever is saved
 * by where it plays: the guitar's and mandolin's changes (by where their
 * chord starts) and the tempo lane's points.
 *
 * @typedef {(quarters: number) => number | null} Along
 */

/**
 * @param {number} from
 * @param {number} to
 * @returns {Along}
 */
export function cutAlong(from, to) {
	return (quarters) => {
		if (quarters < from) return quarters;
		return quarters < to ? null : quarters - (to - from);
	};
}

/**
 * @param {number} at
 * @param {number} length
 * @returns {Along}
 */
export function insertAlong(at, length) {
	return (quarters) => (quarters < at ? quarters : quarters + length);
}

/**
 * Edits saved by the place their chord starts (`"12": {…}`), moved along.
 * @template T
 * @param {Record<string, T>} edits
 * @param {Along} along
 * @returns {Record<string, T>}
 */
export function keyedAlong(edits, along) {
	return Object.fromEntries(
		Object.entries(edits).flatMap(([place, edit]) => {
			const moved = along(Number(place));
			return moved === null ? [] : [[String(moved), edit]];
		})
	);
}

/**
 * @param {import('../chart/tempoCurve.js').TempoPoint[]} points
 * @param {Along} along
 */
export function pointsAlong(points, along) {
	return points.flatMap((point) => {
		const at = along(point.at);
		return at === null ? [] : [{ ...point, at }];
	});
}
