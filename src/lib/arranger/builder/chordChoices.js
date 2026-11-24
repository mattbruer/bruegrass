/**
 * The chords the builder offers as buttons: the key's own chords first
 * (the ones a bluegrass song mostly uses), then any root with any quality
 * the band can play.
 */
import { mod12, noteName, noteOfKey, notePc } from '../chart/key.js';
import { hasShape } from '../instruments/chordBook.js';

/** A key's chords: semitones above the tonic and the chord's quality. Plain data, in the order shown. */
const KEY_CHORDS = {
	major: [
		[0, ''],
		[5, ''],
		[7, ''],
		[7, '7'],
		[9, 'm'],
		[2, 'm'],
		[4, 'm'],
		[2, '7'],
		[10, '']
	],
	minor: [
		[0, 'm'],
		[5, 'm'],
		[7, 'm'],
		[7, '7'],
		[3, ''],
		[8, ''],
		[10, '']
	]
};

export const ROOT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const ACCIDENTALS = [
	{ id: '', label: '♮' },
	{ id: '#', label: '♯' },
	{ id: 'b', label: '♭' }
];
export const QUALITIES = ['', 'm', '7', 'm7', 'maj7', '6', 'sus4', 'dim'];

/** When the chart has no chord yet to say its key. */
const KEY_BEFORE_ANY_CHORD = { tonic: { letter: 4, accidental: 0 }, minor: false };

/**
 * @param {import('../chart/key.js').Key | null} key
 * @returns {string[]} chord names, spelled in the key
 */
export function chordsInKey(key) {
	const { tonic, minor } = key ?? KEY_BEFORE_ANY_CHORD;
	return KEY_CHORDS[minor ? 'minor' : 'major']
		.map(([above, quality]) => noteName(noteOfKey(tonic, mod12(notePc(tonic) + above))) + quality)
		.filter(hasShape);
}

/**
 * @param {string} letter
 * @param {string} accidental
 * @param {string} quality
 * @returns {string | null} null when the band has no shape for it
 */
export function chordFrom(letter, accidental, quality) {
	const name = letter + accidental + quality;
	return hasShape(name) ? name : null;
}
