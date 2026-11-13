/**
 * How far a view zooms: a size multiplier on each axis, stepping through
 * these levels (1 = the view's own size).
 */

export const ZOOM_LEVELS = [0.5, 0.7, 1, 1.4, 2, 2.8, 4];

/**
 * The next level in or out from this one.
 * @param {number} level
 * @param {1 | -1} step 1 = bigger
 */
export function zoomStep(level, step) {
	const index = ZOOM_LEVELS.findIndex((each) => each >= level - 0.001);
	const from = index === -1 ? ZOOM_LEVELS.length - 1 : index;
	const to = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, from + step));
	return ZOOM_LEVELS[to];
}

/** @param {number} level */
export const canZoomIn = (level) => level < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
/** @param {number} level */
export const canZoomOut = (level) => level > ZOOM_LEVELS[0];

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
