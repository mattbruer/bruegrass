/**
 * A section marker on a bar of the tracks ruler: a name on a bar starts a
 * section there (a `"Name"` line in the chart), as Transcribe's markers do.
 * Plain functions, a chart in and a new chart out (like chartEdits.js).
 * A section that repeats another (`as`) has no bars of its own, so it
 * can't be split or renamed here.
 *
 * @typedef {import('../chart/writtenChart.js').WrittenChart} WrittenChart
 * @typedef {{ section: number, bar: number }} BarPlace
 */

import { joinLyricLines, splitLyricLines } from '../chart/sectionLyrics.js';

/* Characters that would break the chart's syntax in a section's name */
const NOT_IN_NAME = /["\n]/g;

/**
 * Name the section starting at a bar: a bar inside a section splits it there,
 * the first bar renames it, and an empty name takes the marker away (the
 * section joins the one before it). The first section always keeps its name.
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 * @param {string} name
 */
export function setSectionMarker(chart, place, name) {
	const cleaned = name.replace(NOT_IN_NAME, '').trim();
	const section = chart.sections[place.section];
	if (!section || section.repeats || place.bar >= section.bars.length) return chart;
	if (place.bar > 0) return cleaned ? splitAt(chart, place, cleaned) : chart;
	if (cleaned) return renamed(chart, place.section, cleaned);
	return place.section > 0 ? joinedToPrevious(chart, place.section) : chart;
}

/**
 * @param {WrittenChart} chart
 * @param {number} index
 * @param {string} name
 */
function renamed(chart, index, name) {
	const copy = structuredClone(chart);
	copy.sections[index].name = name;
	return copy;
}

/**
 * The bars from `place.bar` on become a new section after this one, with
 * the words sung in them.
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 * @param {string} name
 */
function splitAt(chart, place, name) {
	const copy = structuredClone(chart);
	const first = copy.sections[place.section];
	const [keptWords, movedWords] = splitLyricLines(first.lyrics, place.bar);
	const second = {
		name,
		repeats: null,
		bars: first.bars.splice(place.bar),
		tail: first.tail,
		lyrics: movedWords
	};
	first.lyrics = keptWords;
	first.tail = [];
	copy.sections.splice(place.section + 1, 0, second);
	return copy;
}

/**
 * The section's bars go on the end of the one before it, and its fields
 * after the last bar carry on there.
 * @param {WrittenChart} chart
 * @param {number} index
 */
function joinedToPrevious(chart, index) {
	const copy = structuredClone(chart);
	const previous = copy.sections[index - 1];
	const gone = copy.sections[index];
	if (previous.repeats) return chart;
	if (gone.bars[0]) gone.bars[0].fields = [...previous.tail, ...gone.bars[0].fields];
	else gone.tail = [...previous.tail, ...gone.tail];
	previous.lyrics = joinLyricLines(previous.lyrics, previous.bars.length, gone.lyrics);
	previous.bars.push(...gone.bars);
	previous.tail = gone.tail;
	copy.sections.splice(index, 1);
	return copy;
}
