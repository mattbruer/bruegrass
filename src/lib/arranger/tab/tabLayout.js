/** How the TAB is spaced (pixels). */
const STRING_SPACING = 26;
const EDGE = 16;

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
