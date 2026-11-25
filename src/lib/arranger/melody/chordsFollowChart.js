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
import { tuneSplitAtChanges } from './splitHeldNotes.js';
import { tuneReader } from './abcjs.js';
import { hasLyrics, hasWords, withChartWordsAgain } from './words/wordsAgain.js';

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
 * The tune following the chart's chords: a held note is split where the
 * chord changes inside it (splitHeldNotes.js), so the change has a note to
 * be shown on, and the chart's words are placed again on the new notes; then
 * every symbol is written fresh. Words typed only in the ABC would slip off
 * their notes, so a tune with those keeps its notes whole.
 * @param {string} abc the tune
 * @param {any[][]} voices abcjs.synth.sequence(tune) for that ABC
 * @param {any} abcjs
 * @param {{ sections: import('../chart/timeline.js').Section[], lyrics: import('../chart/sectionLyrics.js').SectionLyrics[], capo: number }} song
 * @returns {string}
 */
export function tuneFollowingChart(abc, voices, abcjs, song) {
	const split =
		hasWords(abc) && !hasLyrics(song.lyrics) ? null : splitAndRead(abc, voices, abcjs, song);
	const text = split?.text ?? abc;
	return tuneWithChartChords(text, split?.voices ?? voices, song.sections, song.capo);
}

/**
 * The tune with its held notes split at chord changes, and read again.
 * @param {string} abc
 * @param {any[][]} voices
 * @param {any} abcjs
 * @param {Parameters<typeof tuneFollowingChart>[3]} song
 * @returns {{ text: string, voices: any[][] } | null} null when nothing was split, or it can't be read
 */
function splitAndRead(abc, voices, abcjs, song) {
	const split = tuneSplitAtChanges(abc, voices, song.sections);
	if (split === abc) return null;
	const parse = tuneReader(abcjs);
	const text = withChartWordsAgain(split, song, abcjs, parse);
	try {
		return { text, voices: abcjs.synth.sequence(parse(text), {}) };
	} catch {
		return null;
	}
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
