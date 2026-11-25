/**
 * The bar ruler across the top of the tracks: the song's bars in play
 * order, from where the song starts (playback/songStart.js: the pickup bar
 * when there is one, else bar 1). Times in quarter notes from bar 1.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';

/**
 * @typedef {{ number: number, start: number, beats: number, sectionName: string | null, label?: string }} RulerBar
 *   number: 0 for the pickup bar; sectionName: where a section starts; label: shown instead of the number
 *
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {number} songStart quarters from bar 1 (negative: a pickup bar)
 * @returns {RulerBar[]}
 */
export function rulerBars(sections, songStart) {
	const bars = barsInPlayOrder(sections);
	if (bars.length === 0) return [];
	const pickupBar =
		songStart < 0 ? [{ number: 0, start: songStart, beats: -songStart, sectionName: null }] : [];
	return [
		...pickupBar,
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
