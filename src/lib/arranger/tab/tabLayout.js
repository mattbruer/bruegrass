/** How the TAB strip under the piano roll is spaced (pixels). */
export const STRING_SPACING = 18;
const EDGE = 12;

/**
 * Where a string's line is, from the strip's top.
 * @param {number} string index, top line first
 */
export function lineY(string) {
	return EDGE + string * STRING_SPACING;
}

/** @param {import('./fretboards.js').Fretboard} board */
export function tabHeight(board) {
	return EDGE * 2 + (board.strings.length - 1) * STRING_SPACING;
}
