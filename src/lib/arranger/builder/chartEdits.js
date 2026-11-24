/**
 * What each button of the chart builder does to the chart as written
 * (chart/writtenChart.js): plain functions, a chart in and a new chart out.
 * A bar's words (the lyric lines under its section) move with the bar.
 *
 * @typedef {import('../chart/writtenChart.js').WrittenChart} WrittenChart
 * @typedef {import('../chart/writtenChart.js').WrittenBar} WrittenBar
 * @typedef {{ section: number, bar: number }} BarPlace
 * @typedef {BarPlace & { chord: number }} ChordPlace
 */
import { lyricLines, lyricsFromLines } from '../chart/sectionLyrics.js';
import { splitMark } from '../chart/analysisMarks.js';
import { splitHit } from '../chart/hits.js';

/* Characters that would break the chart's syntax in a section's name */
const NOT_IN_NAME = /["\n]/g;
/** A key named mid-bar, written in front of the chord it starts on. */
const LEADING_FIELDS = /^(\s*\[[^\]]*\])*/;

/**
 * @param {WrittenChart} chart
 * @param {(chart: WrittenChart) => void} change edits the copy in place
 */
function changed(chart, change) {
	const copy = structuredClone(chart);
	change(copy);
	return copy;
}

/** A chord's name, without its marks or a key named in front of it. */
export function chordName(/** @type {string} */ written) {
	return splitHit(splitMark(written.replace(LEADING_FIELDS, '')).chord).chord;
}

/**
 * Put a chord in a bar's place (one past its last chord adds one). Its old
 * mark goes with the old chord; a key named in front of it stays.
 * @param {WrittenChart} chart
 * @param {ChordPlace} place
 * @param {string} name
 */
export function setChord(chart, place, name) {
	return changed(chart, (copy) => {
		const bar = copy.sections[place.section].bars[place.bar];
		const before = bar.chords[place.chord]?.match(LEADING_FIELDS)?.[0] ?? '';
		bar.chords[place.chord] = before + name;
	});
}

/**
 * @param {WrittenChart} chart
 * @param {ChordPlace} place
 */
export function removeChord(chart, place) {
	return changed(chart, (copy) => {
		copy.sections[place.section].bars[place.bar].chords.splice(place.chord, 1);
	});
}

/**
 * Empty a bar: it holds the chord before it.
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 */
export function holdBar(chart, place) {
	return changed(chart, (copy) => {
		copy.sections[place.section].bars[place.bar].chords = [];
	});
}

/**
 * A new bar with these chords, at `bar` (the section's length adds one at the end).
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 * @param {string[]} chords
 */
export function insertBar(chart, place, chords) {
	return changed(chart, (copy) => {
		const section = copy.sections[place.section];
		section.bars.splice(place.bar, 0, { chords, fields: [] });
		section.lyrics = shiftedWords(section.lyrics, place.bar, 1);
	});
}

/**
 * A copy of a bar right after it (its words stay with the first).
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 */
export function duplicateBar(chart, place) {
	const bar = chart.sections[place.section].bars[place.bar];
	return insertBar(chart, { ...place, bar: place.bar + 1 }, [...bar.chords]);
}

/**
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 */
export function deleteBar(chart, place) {
	return changed(chart, (copy) => {
		const section = copy.sections[place.section];
		const [gone] = section.bars.splice(place.bar, 1);
		// Its time or key change carries on from the bar that takes its place
		const next = section.bars[place.bar];
		if (next) next.fields = [...gone.fields, ...next.fields];
		else section.tail = [...gone.fields, ...section.tail];
		section.lyrics = shiftedWords(section.lyrics, place.bar, -1);
	});
}

/**
 * A bar's own fields replaced by these time fields (keys stay).
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 * @param {string[]} timeFields e.g. ["[2/4]"], ["[M:3/4]"], or none
 */
export function setBarTime(chart, place, timeFields) {
	return changed(chart, (copy) => {
		const bar = copy.sections[place.section].bars[place.bar];
		bar.fields = [...bar.fields.filter((field) => /^\[K:/i.test(field)), ...timeFields];
	});
}

/**
 * The words sung in one bar.
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 * @param {string} words
 */
export function setBarWords(chart, place, words) {
	return changed(chart, (copy) => {
		const section = copy.sections[place.section];
		const lyrics = lyricsFromLines(section.lyrics);
		while (lyrics.bars.length <= place.bar) lyrics.bars.push('');
		lyrics.bars[place.bar] = words.replaceAll('|', '');
		section.lyrics = lyricLines(lyrics);
	});
}

/**
 * Whether a new line of words starts at this bar (on the lyric chart).
 * @param {WrittenChart} chart
 * @param {BarPlace} place
 */
export function toggleLineStart(chart, place) {
	return changed(chart, (copy) => {
		const section = copy.sections[place.section];
		const lyrics = lyricsFromLines(section.lyrics);
		while (lyrics.bars.length <= place.bar) lyrics.bars.push('');
		const starts = new Set(lyrics.rowStarts);
		if (starts.has(place.bar)) starts.delete(place.bar);
		else starts.add(place.bar);
		lyrics.rowStarts = [...starts].sort((a, b) => a - b);
		section.lyrics = lyricLines(lyrics);
	});
}

/**
 * The words sung before a section's first bar.
 * @param {WrittenChart} chart
 * @param {number} section
 * @param {string} words
 */
export function setPickupWords(chart, section, words) {
	return changed(chart, (copy) => {
		const lyrics = lyricsFromLines(copy.sections[section].lyrics);
		lyrics.pickup = words.replaceAll('|', '');
		copy.sections[section].lyrics = lyricLines(lyrics);
	});
}

/**
 * @param {string[]} lines a section's lyric lines
 * @param {number} at the bar inserted or deleted
 * @param {1 | -1} by
 */
function shiftedWords(lines, at, by) {
	const lyrics = lyricsFromLines(lines);
	if (lyrics.bars.length <= at) return lines;
	if (by > 0) lyrics.bars.splice(at, 0, '');
	else lyrics.bars.splice(at, 1);
	const moves = (/** @type {number} */ start) => (by > 0 ? start >= at : start > at) && start > 0;
	lyrics.rowStarts = lyrics.rowStarts
		.filter((start) => by > 0 || start !== at || start === 0)
		.map((start) => (moves(start) ? start + by : start));
	return lyricLines(lyrics);
}

/** @param {string} name */
export function cleanName(name) {
	return name.replace(NOT_IN_NAME, '').trim();
}

/**
 * A name no other section has: "Verse", then "Verse 2", "Verse 3"…
 * @param {WrittenChart} chart
 * @param {string} name
 */
export function freeName(chart, name) {
	const taken = new Set(chart.sections.map((section) => section.name));
	if (!taken.has(name)) return name;
	let n = 2;
	while (taken.has(`${name} ${n}`)) n++;
	return `${name} ${n}`;
}

/**
 * A new section after `after` (-1: at the top), with these bars.
 * @param {WrittenChart} chart
 * @param {number} after
 * @param {string} name
 * @param {WrittenBar[]} [bars]
 */
export function addSection(chart, after, name, bars = []) {
	return changed(chart, (copy) => {
		copy.sections.splice(after + 1, 0, {
			name: freeName(copy, cleanName(name) || 'Part'),
			repeats: null,
			bars: structuredClone(bars),
			tail: [],
			lyrics: []
		});
	});
}

/**
 * A copy of a section, bars and words, after it.
 * @param {WrittenChart} chart
 * @param {number} section
 */
export function duplicateSection(chart, section) {
	const original = chart.sections[section];
	const copy = addSection(chart, section, original.name, ownBars(chart, section));
	copy.sections[section + 1].lyrics = [...original.lyrics];
	return copy;
}

/**
 * Rename a section; repeats of it follow the new name.
 * @param {WrittenChart} chart
 * @param {number} section
 * @param {string} name
 */
export function renameSection(chart, section, name) {
	const clean = cleanName(name);
	const old = chart.sections[section].name;
	if (!clean || clean === old) return chart;
	return changed(chart, (copy) => {
		const unique = freeName(copy, clean);
		copy.sections[section].name = unique;
		for (const other of copy.sections) if (other.repeats === old) other.repeats = unique;
	});
}

/**
 * Delete a section. Its repeats get its bars written out, so they still play.
 * @param {WrittenChart} chart
 * @param {number} section
 */
export function deleteSection(chart, section) {
	const name = chart.sections[section].name;
	return changed(chart, (copy) => {
		for (const [index, other] of copy.sections.entries()) {
			if (other.repeats === name) Object.assign(other, writtenOut(chart, index));
		}
		copy.sections.splice(section, 1);
	});
}

/**
 * Swap a section with the one above (-1) or below (1).
 * @param {WrittenChart} chart
 * @param {number} section
 * @param {-1 | 1} by
 */
export function moveSection(chart, section, by) {
	const to = section + by;
	if (to < 0 || to >= chart.sections.length) return chart;
	return changed(chart, (copy) => {
		const [moved] = copy.sections.splice(section, 1);
		copy.sections.splice(to, 0, moved);
	});
}

/**
 * Make a section play another one again (`as`), or, with null, give it its
 * own copy of the bars it was repeating, to change.
 * @param {WrittenChart} chart
 * @param {number} section
 * @param {string | null} name
 */
export function setRepeat(chart, section, name) {
	return changed(chart, (copy) => {
		const target = copy.sections[section];
		if (name) Object.assign(target, { repeats: name, bars: [], tail: [] });
		else Object.assign(target, writtenOut(chart, section));
	});
}

/**
 * The sections a section could repeat: ones with their own bars, not itself.
 * @param {WrittenChart} chart
 * @param {number} section
 */
export function sectionsToRepeat(chart, section) {
	return chart.sections.filter((other, index) => index !== section && !other.repeats);
}

/**
 * A section's bars, following a repeat to the section it plays.
 * @param {WrittenChart} chart
 * @param {number} section
 * @returns {WrittenBar[]}
 */
export function ownBars(chart, section) {
	const { repeats, bars } = chart.sections[section];
	if (!repeats) return structuredClone(bars);
	return structuredClone(chart.sections.find((other) => other.name === repeats)?.bars ?? []);
}

/** @param {WrittenChart} chart @param {number} section */
function writtenOut(chart, section) {
	return { repeats: null, bars: ownBars(chart, section), tail: [] };
}
