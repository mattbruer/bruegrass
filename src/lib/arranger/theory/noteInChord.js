/**
 * What a note is in a chord: its degree above the root (the 3rd, the ♭7th,
 * a 9th) and its letter spelled from that degree, so the ♭7th of C is B♭,
 * never A♯, and the ♯9th is D♯, not E♭. A note of the chord is named as the
 * chord names it (chordTypes.js: the ♭5th of a diminished chord); any other
 * note as the tension it would be (9th, ♯11th, ♭13th…).
 */
import { mod12, notePc, parseChord } from '../chart/key.js';
import { readChordName } from './chordTypes.js';
import { readDegrees } from './degreeLabels.js';

/** A note outside the chord, by semitones above its root. */
const OUTSIDE = ['1', 'b9', '9', '#9', '3', '11', '#11', '5', 'b13', '13', 'b7', '7'];

/**
 * @typedef {{
 *   letter: number, accidental: number, degree: string, words: string, inChord: boolean
 * }} NoteInChord
 *   letter: index into C D E F G A B; accidental: in semitones (-1 flat);
 *   degree: "b7", "#9"; words: "♭7th", "root"; inChord: one of the chord's own notes
 */

/**
 * @param {number} pitch MIDI (or a pitch class)
 * @param {string} chordName e.g. "Bb7", without a slash bass or variant
 * @returns {NoteInChord | null} null: a chord the theory doesn't know
 */
export function noteInChord(pitch, chordName) {
	const chord = readChordName(chordName);
	const root = parseChord(chordName)?.root;
	if (!chord || !root) return null;
	const above = mod12(pitch - chord.root);
	const own = readDegrees(chord.type.tones).find((tone) => tone.semitones === above);
	const degree = own?.label ?? OUTSIDE[above];
	const letter = (root.letter + degreeNumber(degree) - 1) % 7;
	const accidental = mod12(pitch - notePc({ letter, accidental: 0 }) + 6) - 6;
	return { letter, accidental, degree, words: inWords(degree), inChord: own !== undefined };
}

/** @param {string} degree "b7" → 7 */
function degreeNumber(degree) {
	return Number(degree.replace(/[#b]/g, ''));
}

/**
 * @param {string} degree "b7" → "♭7th", "1" → "root"
 */
export function inWords(degree) {
	const number = degreeNumber(degree);
	if (number === 1) return 'root';
	const ordinal = number === 2 ? 'nd' : number === 3 ? 'rd' : 'th';
	const signs = degree.replace(/\d/g, '').replace(/b/g, '♭').replace(/#/g, '♯');
	return `${signs}${number}${ordinal}`;
}
