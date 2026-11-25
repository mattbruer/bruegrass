/**
 * The tune's chord symbols, always the chart's. The chart is the one place
 * chords are kept: when its chords change, every symbol in the tune is
 * written fresh, at concert pitch, on the note each change lands on
 * (abcChords.js `chordSymbolPlaces`). Writing all of them, rather than
 * only the bars that changed, keeps a symbol right when it depends on the
 * bar before (a G after a bar of C needs one; after a bar of G it doesn't).
 */
import { barsInPlayOrder } from '../chart/chartBars.js';
import { songKey } from '../chart/key.js';
import { concertChord } from '../chart/concertChords.js';
import { isNoChord } from '../chart/noChord.js';
import { chordSymbolPlaces } from './abcChords.js';

/** A chord symbol that's an annotation ("^n.c.", "_text"), not a chord. */
const ANNOTATION = /^[\^_<>@]/;
/** What can come before a note: chord symbols, annotations and decorations (!fermata!, ~, .). */
const BEFORE_A_NOTE = /^(?:"[^"]*"|![^!]*!|[.~]|\s)*/;

/**
 * What each bar plays, in play order, to tell when the chart's chords
 * change: its length and its chords at concert pitch.
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
 * The tune with every chord symbol written fresh from the chart.
 * Annotations and decorations stay.
 * @param {string} abc the tune
 * @param {any[][]} voices abcjs.synth.sequence(tune) for that ABC
 * @param {import('../chart/timeline.js').Section[]} sections the chart now
 * @param {number} capo
 * @returns {string}
 */
export function tuneWithChartChords(abc, voices, sections, capo) {
	const { symbols, played } = chordSymbolPlaces(voices, sections, { capo });
	/** @type {Map<number, string | null>} startChar → the symbol it gets (null: none) */
	const edits = new Map();
	for (const item of played) edits.set(/** @type {number} */ (item.startChar), null);
	for (const [startChar, { name }] of symbols) edits.set(startChar, isNoChord(name) ? null : name);

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
