/**
 * The trace's recent past: a point per frame, newest first, with the
 * cents heard then, or null where nothing was heard (a gap in the line).
 * @param {number} seconds how far back it keeps
 */
export function createTraceHistory(seconds) {
	/** @type {{ time: number, cents: number | null }[]} */
	const points = [];

	return {
		points,
		/** @param {number} time seconds @param {number | null} cents */
		add(time, cents) {
			points.unshift({ time, cents });
			while (
				points.length > 1 &&
				time - /** @type {{ time: number }} */ (points.at(-1)).time > seconds
			) {
				points.pop();
			}
		},
		clear() {
			points.length = 0;
		}
	};
}
