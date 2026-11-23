/**
 * The tune's chord symbols kept with the chart. When bars' chords change in
 * the chart, those bars' symbols are written fresh: the chart's chords at
 * concert pitch, on the note each change lands on (abcChords.js
 * `chordSymbolPlaces`). Every other symbol stays as written, so a tune's
 * own Cmaj7 isn't flattened to the chart's C by an edit somewhere else.
 * Bars are matched like a text diff (bass/matchBars.js), so adding or
 * removing a bar leaves the others' symbols alone.
 */
import { barsInPlayOrder } from '../chart/chartBars.js';
import { songKey } from '../chart/key.js';
import { concertChord } from '../chart/concertChords.js';
import { isNoChord } from '../chart/noChord.js';
import { matchBars } from '../bass/matchBars.js';
import { chordSymbolPlaces } from './abcChords.js';

const EPSILON = 1e-6;

/** A chord symbol that's an annotation ("^n.c.", "_text"), not a chord. */
const ANNOTATION = /^[\^_<>@]/;
/** What can come before a note: chord symbols, annotations and decorations (!fermata!, ~, .). */
const BEFORE_A_NOTE = /^(?:"[^"]*"|![^!]*!|[.~]|\s)*/;

/**
 * What each bar plays, in play order, to tell which bars an edit changed:
 * its length and its chords at concert pitch.
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {number} capo
 * @returns {string[]}
 */
export function barChordKeys(sections, capo) {
	const key = songKey(sections);
	return barsInPlayOrder(sections).map(
		(bar) =>
			`${bar.beats}:` +
			bar.chords
				.map((chord) => `${concertChord(chord.name, chord.key ?? key, capo)}/${chord.length}`)
				.join(',')
	);
}

/**
 * The bars (play-order indexes, new numbering) whose chords an edit changed.
 * @param {string[]} before barChordKeys before the edit
 * @param {string[]} after barChordKeys now
 */
export function changedBars(before, after) {
	const matched = matchBars(before, after);
	return after.flatMap((_, index) => (matched.has(index) ? [] : [index]));
}

/**
 * The tune with the given bars' chord symbols written fresh from the chart.
 * @param {string} abc the tune
 * @param {any[][]} voices abcjs.synth.sequence(tune) for that ABC
 * @param {import('../chart/timeline.js').Section[]} sections the chart now
 * @param {number} capo
 * @param {number[]} bars play-order indexes of the bars to rewrite
 * @returns {string}
 */
export function tuneFollowingChords(abc, voices, sections, capo, bars) {
	if (bars.length === 0) return abc;
	const spans = barsInPlayOrder(sections)
		.filter((bar) => bars.includes(bar.index))
		.map((bar) => ({ from: bar.start, to: bar.start + bar.beats }));
	const inChangedBar = (/** @type {number} */ time) =>
		spans.some(({ from, to }) => time >= from - EPSILON && time < to - EPSILON);

	const { symbols, played } = chordSymbolPlaces(voices, sections, { capo });
	/** @type {Map<number, string | null>} startChar → the symbol it gets (null: none) */
	const edits = new Map();
	for (const item of played) {
		if (inChangedBar(item.t)) edits.set(/** @type {number} */ (item.startChar), null);
	}
	for (const [startChar, { name, start }] of symbols) {
		if (inChangedBar(start)) edits.set(startChar, isNoChord(name) ? null : name);
	}

	let result = abc;
	for (const [startChar, name] of [...edits].sort((a, b) => b[0] - a[0])) {
		const rest = withoutChordSymbols(result.slice(startChar));
		result = result.slice(0, startChar) + (name ? `"${name}"` : '') + rest;
	}
	return result;
}

/**
 * A note's text without the chord symbols in front of it; annotations and
 * decorations stay.
 * @param {string} text from the note's first character
 */
function withoutChordSymbols(text) {
	const lead = text.match(BEFORE_A_NOTE)?.[0] ?? '';
	const kept = lead.replace(/"([^"]*)"\s*/g, (all, inside) => (ANNOTATION.test(inside) ? all : ''));
	return kept + text.slice(lead.length);
}
