/**
 * How big to draw the pages on screen: as large as fits the width, but
 * never so tall that a whole page can't be seen at once.
 */
import { PAPER } from './paper.js';

export const PAGE_GAP_PX = 24;
/** Kept free under the pages for the page arrows. */
export const NAV_ROOM_PX = 64;
/** Never smaller than this, however short the window (it scrolls instead). */
const SMALLEST_SCALE = 0.3;

/**
 * @param {number} width the room for the pages
 * @param {number} height the room for the pages
 */
export function pageScale(width, height) {
	if (!width || !height) return 0.5;
	const fit = Math.min(1, width / PAPER.width, height / PAPER.height);
	return Math.max(SMALLEST_SCALE, fit);
}

/**
 * How many pages fit side by side.
 * @param {number} width
 * @param {number} scale
 */
export function pagesSideBySide(width, scale) {
	return Math.max(1, Math.floor((width + PAGE_GAP_PX) / (PAPER.width * scale + PAGE_GAP_PX)));
}
