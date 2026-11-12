/**
 * How the tracks turn time into width: one fixed scale, from the start of
 * the count-in bar.
 */

/** How wide a quarter note is on the tracks (px). */
export const PIXELS_PER_QUARTER = 32;

/**
 * @param {{ start: number, end: number }} span quarter notes
 * @param {number} [pixelsPerQuarter] wider for a view that needs room (Transcribe's chord boxes)
 */
export function trackScale({ start, end }, pixelsPerQuarter = PIXELS_PER_QUARTER) {
	return {
		/** Where the scale starts (quarters from bar 1). */
		start,
		width: (end - start) * pixelsPerQuarter,
		/** @param {number} quarters from bar 1 */
		toX: (quarters) => (quarters - start) * pixelsPerQuarter,
		/** @param {number} pixels a width (add `start` for a place) */
		toQuarters: (pixels) => pixels / pixelsPerQuarter
	};
}
