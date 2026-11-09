/**
 * The lyric chart as plain data: the arrangement's bars with their words,
 * grouped into rows the way the lyrics are written (one sung line per
 * row). Bars without words go four to a row.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';

const BARS_PER_ROW_WITHOUT_WORDS = 4;

/**
 * @typedef {import('../chart/chartBars.js').BarChord & { shown: boolean }} RowChord
 *   shown: false when the chord just carries on from the bar before
 * @typedef {Omit<import('../chart/chartBars.js').ChartBar, 'chords'> & {
 *   chords: RowChord[], words: string, meterChange: string | null, endsSection: boolean
 * }} RowBar
 * @typedef {{ name: string, pickup: string, rows: RowBar[][] }} ChartSection
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {import('../chart/sectionLyrics.js').SectionLyrics[]} lyrics one per section
 * @returns {{ sections: ChartSection[], problems: string[] }}
 */
export function chartSections(sections, lyrics) {
	const bars = markChordChanges(barsInPlayOrder(sections));
	/** @type {string[]} */
	const problems = [];

	const chartSections = sections.map((section, s) => {
		const words = lyrics[s] ?? { pickup: '', bars: [], rowStarts: [] };
		const sectionBars = bars.filter((bar) => bar.section === s);
		const name = section.name ?? '';

		if (words.bars.length > sectionBars.length) {
			problems.push(
				`${name}: the words have ${words.bars.length} bars, the chords ${sectionBars.length}.`
			);
		}

		const withWords = sectionBars.map((bar, m) => ({
			...bar,
			words: words.bars[m] ?? '',
			endsSection: m === sectionBars.length - 1
		}));
		return { name, pickup: words.pickup, rows: splitRows(withWords, words) };
	});

	return { sections: chartSections, problems };
}

/**
 * A chord is shown where it changes, at the start of a section, and in
 * any bar with more than one chord; the time signature where it changes
 * after the first bar (the chart's header gives the first).
 * @param {import('../chart/chartBars.js').ChartBar[]} bars
 */
function markChordChanges(bars) {
	return bars.map((bar, b) => {
		const before = bars[b - 1]?.chords.at(-1)?.name;
		const split = bar.chords.length > 1;
		return {
			...bar,
			meterChange: b > 0 ? bar.meter : null,
			chords: bar.chords.map((chord) => ({
				...chord,
				shown: split || bar.sectionStart || chord.name !== before
			}))
		};
	});
}

/**
 * @template T
 * @param {T[]} bars one section's
 * @param {import('../chart/sectionLyrics.js').SectionLyrics} words
 * @returns {T[][]}
 */
function splitRows(bars, words) {
	const starts = new Set([0, ...words.rowStarts]);
	for (let b = words.bars.length; b < bars.length; b += BARS_PER_ROW_WITHOUT_WORDS) starts.add(b);

	const sorted = [...starts].filter((b) => b < bars.length).sort((a, b) => a - b);
	return sorted.map((start, r) => bars.slice(start, sorted[r + 1] ?? bars.length));
}
