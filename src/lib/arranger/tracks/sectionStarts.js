/**
 * Where each section starts as the song plays (quarters from bar 1), after
 * the first: the places "Split at sections" cuts a clip.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';

/** @param {import('../chart/timeline.js').Section[]} sections */
export function sectionStarts(sections) {
	return barsInPlayOrder(sections)
		.filter((bar) => bar.sectionStart && bar.start > 0)
		.map((bar) => bar.start);
}
