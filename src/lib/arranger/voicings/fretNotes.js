/**
 * The notes a fretted shape sounds, each spelled and named against the
 * chord (theory/noteInChord.js), lowest string first, for the chord editors.
 */
import { noteInChord } from '../theory/noteInChord.js';
import { withoutBass, withoutVariant } from '../instruments/chordBook.js';

/**
 * @typedef {import('../theory/noteInChord.js').NoteInChord & { string: number, fret: number, pitch: number }} FretNote
 */

/**
 * @param {(number | null)[]} frets lowest string first, null = muted
 * @param {number[]} open each open string's MIDI pitch
 * @param {string} chordName the chord they're named against (a slash bass or variant is left off)
 * @returns {FretNote[]}
 */
export function fretNotes(frets, open, chordName) {
	const chord = withoutBass(withoutVariant(chordName));
	return frets.flatMap((fret, string) => {
		if (fret === null) return [];
		const pitch = open[string] + fret;
		const note = noteInChord(pitch, chord);
		return note ? [{ string, fret, pitch, ...note }] : [];
	});
}

/**
 * A note's degree, short, for a dot: "b7" → "♭7", "1" → "R".
 * @param {string} degree
 */
export function shortDegree(degree) {
	return degree === '1' ? 'R' : degree.replace(/b/g, '♭').replace(/#/g, '♯');
}

/**
 * What each string's dot says, and whether it's one of the chord's own
 * notes (a muted string: null, and true).
 * @param {FretNote[]} notes
 * @param {number} strings how many strings
 */
export function dotsFor(notes, strings) {
	const on = (/** @type {number} */ string) => notes.find((note) => note.string === string);
	return {
		marks: Array.from({ length: strings }, (_, string) => {
			const note = on(string);
			return note ? shortDegree(note.degree) : null;
		}),
		inChord: Array.from({ length: strings }, (_, string) => on(string)?.inChord ?? true)
	};
}
