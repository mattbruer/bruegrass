/**
 * The song's chart as Transcribe shows it on the recording's bars: the
 * chart's bars in play order line up one for one with the recording's
 * (bar 1 with bar 1). The chart is the one place chords live; Transcribe
 * only reads them from here, and writes them back into the chart.
 *
 * Each bar's chords become a slot per beat (barChords.js), each section a
 * marker on the bar it starts on (the first section, "Song", isn't one),
 * and a section's lyric lines are kept by the bar they start on, so
 * writing the chart again keeps them.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';
import { withMark } from '../chart/analysisMarks.js';
import { isNoChord } from '../chart/noChord.js';
import { sectionBlocks } from '../chart/sectionBlocks.js';

/**
 * @typedef {{
 *   chords: Record<number, import('./barChords.js').Slots>,
 *   markers: Record<number, string>,
 *   lyrics: Record<number, string[]>,
 *   places: Record<number, { section: number, measure: number }>
 * }} ChartOnBars
 *   all keyed by bar number; places: where each bar is written in the chart
 */

/** The name chartFromBars gives the bars before the first marker. */
export const UNMARKED_SECTION = 'Song';

/**
 * @param {string} text the chart
 * @param {import('../chart/timeline.js').Section[]} sections the chart read (ArrangementState)
 * @returns {ChartOnBars}
 */
export function readChartOnBars(text, sections) {
	/** @type {ChartOnBars} */
	const read = { chords: {}, markers: {}, lyrics: {}, places: {} };
	const blocks = sectionBlocks(text);
	for (const bar of barsInPlayOrder(sections)) {
		const number = bar.index + 1;
		read.places[number] = { section: bar.section, measure: bar.measure };
		const slots = slotsOfChartBar(bar, sections[bar.section]);
		if (slots) read.chords[number] = slots;
		if (!bar.sectionStart) continue;
		if (bar.index > 0 || bar.sectionName !== UNMARKED_SECTION)
			read.markers[number] = bar.sectionName;
		const lines = blocks[bar.section]?.lines ?? [];
		if (lines.length) read.lyrics[number] = lines;
	}
	return read;
}

/**
 * A chart bar's chords on its beats, with any analysis mark kept on the
 * chord ("A7{V7/V}"). A bar that's all N.C. has none (null); a bar left
 * empty in the chart has slots with no chord in any (barChords.js `isHeld`).
 * @param {import('../chart/chartBars.js').ChartBar} bar
 * @param {import('../chart/timeline.js').Section & { marks?: (string | null)[][] }} section
 */
function slotsOfChartBar(bar, section) {
	/** @type {import('./barChords.js').Slots} */
	const slots = Array(bar.beats).fill(null);
	if (bar.held) return slots;
	if (bar.chords.every((chord) => isNoChord(chord.name))) return null;
	let beat = 0;
	for (const chord of bar.chords) {
		const mark = section.marks?.[bar.measure]?.[chord.chord] ?? null;
		if (beat < slots.length) slots[Math.floor(beat)] = withMark(chord.name, mark);
		beat += chord.length;
	}
	return slots;
}
