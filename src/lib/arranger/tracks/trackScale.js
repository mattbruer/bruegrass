/**
 * How the tracks turn time into width: one fixed scale, from the start of
 * the count-in bar.
 */

/** How wide a quarter note is on the tracks (px). */
export const PIXELS_PER_QUARTER = 32;

/** @param {{ start: number, end: number }} span quarter notes */
export function trackScale({ start, end }) {
	return {
		width: (end - start) * PIXELS_PER_QUARTER,
		/** @param {number} quarters from bar 1 */
		toX: (quarters) => (quarters - start) * PIXELS_PER_QUARTER,
		/** @param {number} pixels */
		toQuarters: (pixels) => pixels / PIXELS_PER_QUARTER
	};
}
