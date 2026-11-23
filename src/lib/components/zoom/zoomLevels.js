/**
 * How far a view zooms: a size multiplier on each axis, stepping through
 * these levels (1 = the view's own size).
 */

export const ZOOM_LEVELS = [0.5, 0.7, 1, 1.4, 2, 2.8, 4];

/** Below the usual levels, each step out shows this much more. */
const STEP_OUT = 1.4;

/**
 * The levels a view steps through: the usual ones, and for a view that can
 * show more (the whole song) further steps out until it all fits.
 * @param {number} [lowest] the level that shows everything
 */
export function zoomLevels(lowest = ZOOM_LEVELS[0]) {
	const levels = ZOOM_LEVELS.filter((level) => level > lowest * 1.05);
	while (levels[0] / STEP_OUT > lowest * 1.2) levels.unshift(levels[0] / STEP_OUT);
	return [lowest, ...levels];
}

/**
 * The next level in or out from this one.
 * @param {number} level
 * @param {1 | -1} step 1 = bigger
 * @param {number} [lowest]
 */
export function zoomStep(level, step, lowest) {
	const levels = zoomLevels(lowest);
	const index = levels.findIndex((each) => each >= level - 0.001);
	const from = index === -1 ? levels.length - 1 : index;
	const to = Math.min(levels.length - 1, Math.max(0, from + step));
	return levels[to];
}

/** @param {number} level */
export const canZoomIn = (level) => level < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
/**
 * @param {number} level
 * @param {number} [lowest]
 */
export const canZoomOut = (level, lowest) => level > zoomLevels(lowest)[0] + 0.001;

/**
 * After a zoom, scroll so what was in the middle of the view stays there.
 * @param {HTMLElement} scroller
 * @param {{ across: number, down: number }} change new size ÷ old size on each axis
 * @param {{ left?: number, top?: number }} [fixed] px of sticky headers that don't zoom
 */
export function keepMiddleInView(scroller, change, fixed = {}) {
	const halfWidth = (scroller.clientWidth - (fixed.left ?? 0)) / 2;
	const halfHeight = (scroller.clientHeight - (fixed.top ?? 0)) / 2;
	scroller.scrollLeft = (scroller.scrollLeft + halfWidth) * change.across - halfWidth;
	scroller.scrollTop = (scroller.scrollTop + halfHeight) * change.down - halfHeight;
}
