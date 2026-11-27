/**
 * A place on the Tracks lanes in words: "Melody, bars 5–8", for the Undo
 * caption and the picked bars.
 */

const EPSILON = 1e-6;
/** A stretch reaching less than this far into a bar (quarters) isn't named as in it: a note ringing over the bar line. */
const INTO_A_BAR = 0.5;

/**
 * @param {{ start: number, beats: number }[]} bars the chart's bars in play order
 * @param {import('./playedSpans.js').Span} span
 * @returns {string} "bar 5", "bars 5–8", "the pickup"
 */
export function barsText(bars, span) {
	const first = barAt(bars, span.from);
	const last = Math.max(first, barAt(bars, span.to - INTO_A_BAR));
	if (first === last) return first === 0 ? 'the pickup' : `bar ${first}`;
	return `bars ${first === 0 ? 'pickup' : first}–${last}`;
}

/**
 * @param {{ start: number, beats: number }[]} bars
 * @param {import('../state/EditHistory.svelte.js').Where | null} where
 * @param {(lane: string) => string} nameOf
 */
export function whereText(bars, where, nameOf) {
	if (where?.wholeSong && where.spans[0]) return `the song, ${barsText(bars, where.spans[0])}`;
	if (!where || where.lanes.length === 0) return '';
	const others = where.lanes.length - 1;
	const lanes = nameOf(where.lanes[0]) + (others > 0 ? ` + ${others}` : '');
	const span = where.spans[0];
	return span ? `${lanes}, ${barsText(bars, span)}` : lanes;
}

/**
 * Bar numbers as the ruler shows them: 1 is the chart's first, 0 the pickup before it.
 * @param {{ start: number, beats: number }[]} bars
 * @param {number} quarters
 */
function barAt(bars, quarters) {
	if (quarters < 0) return 0;
	const index = bars.findIndex(
		(bar) => quarters >= bar.start - EPSILON && quarters < bar.start + bar.beats - EPSILON
	);
	return index < 0 ? bars.length : index + 1;
}
