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

/** A bar's first note sits this far in from its barline, as TAB is written. */
const BAR_LEAD_IN = 18;

/**
 * Where a moment is across the TAB (pixels). Bars keep the roll's width,
 * but inside each the notes are spread over what's left after the lead-in,
 * so a note on the downbeat isn't on the barline.
 * @param {number} tick
 * @param {import('../melody/roll/readScore.js').ScoreBar[]} bars
 * @param {number} tickWidth
 */
export function tabX(tick, bars, tickWidth) {
	const bar = bars.findLast((each) => each.start <= tick);
	if (!bar || tick >= bar.start + bar.length) return tick * tickWidth;
	const barWidth = bar.length * tickWidth;
	const leadIn = Math.min(BAR_LEAD_IN, barWidth / 4);
	const through = (tick - bar.start) / bar.length;
	return bar.start * tickWidth + leadIn + through * (barWidth - leadIn);
}

/**
 * The moment at this place across the TAB: tabX the other way round.
 * @param {number} x pixels
 * @param {import('../melody/roll/readScore.js').ScoreBar[]} bars
 * @param {number} tickWidth
 */
export function tickAtTabX(x, bars, tickWidth) {
	const bar = bars.findLast((each) => each.start * tickWidth <= x);
	if (!bar || x >= (bar.start + bar.length) * tickWidth) return x / tickWidth;
	const barWidth = bar.length * tickWidth;
	const leadIn = Math.min(BAR_LEAD_IN, barWidth / 4);
	const through = Math.max(0, x - bar.start * tickWidth - leadIn) / (barWidth - leadIn);
	return bar.start + through * bar.length;
}
