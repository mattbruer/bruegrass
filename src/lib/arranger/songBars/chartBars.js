/**
 * The chart as written with bars taken out or empty bars put in, through
 * the chart builder's own edits (builder/chartEdits.js), so words, time
 * signatures and keys go with their bars. A section that loses every bar
 * goes too.
 *
 * @typedef {import('../chart/writtenChart.js').WrittenChart} WrittenChart
 */
import { deleteBar, deleteSection, insertBar } from '../builder/chartEdits.js';

/**
 * @param {WrittenChart} chart
 * @param {import('./pickedBars.js').SectionBars[]} sections
 */
export function chartWithoutBars(chart, sections) {
	let edited = chart;
	for (const { section, bars } of [...sections].reverse()) {
		if (bars.length === edited.sections[section].bars.length) {
			edited = deleteSection(edited, section);
			continue;
		}
		for (const bar of [...bars].reverse()) edited = deleteBar(edited, { section, bar });
	}
	return edited;
}

/**
 * Empty bars before a bar: each holds the chord before it, or, at the very
 * start of the song, takes the first chord (the first bar names its chord).
 * @param {WrittenChart} chart
 * @param {{ section: number, bar: number }} place
 * @param {number} count
 */
export function chartWithEmptyBars(chart, place, count) {
	const atTheTop = place.section === 0 && place.bar === 0;
	const first = chart.sections[place.section].bars[place.bar]?.chords[0];
	const chords = atTheTop && first ? [first] : [];
	let edited = chart;
	for (let made = 0; made < count; made++) edited = insertBar(edited, place, [...chords]);
	return edited;
}
