/**
 * The bar ruler across the top of the tracks: the song's bars in play
 * order, after one count-in bar before bar 1, where a pickup is played and
 * where every take file starts. Times in quarter notes from bar 1.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';

/**
 * @typedef {{ number: number, start: number, beats: number, sectionName: string | null }} RulerBar
 *   number: 0 for the count-in bar; sectionName: where a section starts
 *
 * @param {import('../chart/timeline.js').Section[]} sections
 * @returns {RulerBar[]}
 */
export function rulerBars(sections) {
	const bars = barsInPlayOrder(sections);
	if (bars.length === 0) return [];
	const countInBeats = bars[0].beats;
	return [
		{ number: 0, start: -countInBeats, beats: countInBeats, sectionName: null },
		...bars.map((bar) => ({
			number: bar.index + 1,
			start: bar.start,
			beats: bar.beats,
			sectionName: bar.sectionStart ? bar.sectionName : null
		}))
	];
}

/**
 * Where the ruler starts and how long it is, in quarters.
 * @param {RulerBar[]} bars
 */
export function rulerSpan(bars) {
	const last = bars.at(-1);
	return { start: bars[0]?.start ?? 0, end: last ? last.start + last.beats : 0 };
}
