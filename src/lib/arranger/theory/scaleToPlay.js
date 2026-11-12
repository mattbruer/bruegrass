/**
 * The scale to improvise on over a chord, chosen by what the chord does
 * (chord-scale theory, the way Berklee teaches it):
 *
 * The scale the chord comes from, with the chord's own notes swapped in.
 * That's the key's scale for most chords, or the mode a borrowed chord
 * comes from. One rule gives the textbook answers: V7/V is Mixolydian,
 * V7/II Mixolydian ♭13, V7/VI Phrygian dominant, a borrowed IVm Dorian,
 * a bluesy IV7 Lydian ♭7. Two kinds of chord get their own scale: a
 * tritone substitute (Lydian ♭7) and a diminished chord (whole-half).
 */
import { notePc, mod12 } from '../chart/key.js';
import { moveNote } from './rootMotion.js';
import { MODES, OWN_MODES } from './modes.js';
import { scaleName } from './scaleNames.js';

/**
 * @typedef {import('../chart/key.js').Note} Note
 * @typedef {import('../chart/key.js').Key} Key
 * @typedef {import('./analyzeProgression.js').Chord} Chord
 * @typedef {import('./rootMotion.js').Interval} Interval
 * @typedef {{ notes: Note[], semitones: number[], name: string | null }} Scale
 *   notes from the root up, one per letter (two on one letter for whole-half);
 *   semitones: each note above the root
 */

const LYDIAN_DOMINANT = [0, 2, 4, 6, 7, 9, 10];
/* [letters, semitones] above the root: whole step, half step, eight notes */
const WHOLE_HALF = [
	[0, 0],
	[1, 2],
	[2, 3],
	[3, 5],
	[4, 6],
	[5, 8],
	[5, 9],
	[6, 11]
];

/**
 * @param {Chord} chord
 * @param {import('./analyzeProgression.js').ReadingKind} kind
 * @param {Key} key
 * @returns {Scale}
 */
export function scaleToPlay(chord, kind, key) {
	if (chord.family === 'dim' || chord.family === 'dim7')
		return fromIntervals(chord.root, WHOLE_HALF);
	if (kind === 'sub') {
		return fromIntervals(
			chord.root,
			LYDIAN_DOMINANT.map((semitones, letters) => [letters, semitones])
		);
	}
	const parent = scaleOfMode(chord.borrowed ?? OWN_MODES[key.minor ? 'minor' : 'major'][0], key);
	const tones = chordTones(chord);
	const notes = [0, 1, 2, 3, 4, 5, 6].map((letters) => {
		const letter = (chord.root.letter + letters) % 7;
		return (
			tones.find((tone) => tone.letter === letter) ??
			/** @type {Note} */ (parent.find((note) => note.letter === letter))
		);
	});
	return described(chord.root, notes);
}

/**
 * The notes of a chord, spelled from its root: root, 3rd, 5th, and its
 * 7th or 6th if it has one. Extensions (9, ♭9, 13) aren't read yet.
 * @param {Chord} chord
 * @returns {Note[]}
 */
export function chordTones(chord) {
	return chordIntervals(chord).map((interval) => moveNote(chord.root, interval));
}

/**
 * @param {Chord} chord
 * @returns {Interval[]}
 */
function chordIntervals({ family, rest }) {
	const root = { letters: 0, semitones: 0 };
	const minorThird = ['minor', 'halfDim', 'dim', 'dim7'].includes(family);
	const third = /^sus2/.test(rest)
		? { letters: 1, semitones: 2 }
		: /sus/.test(rest)
			? { letters: 3, semitones: 5 }
			: { letters: 2, semitones: minorThird ? 3 : 4 };
	const fifthSemitones = { halfDim: 6, dim: 6, dim7: 6, aug: 8 }[family] ?? 7;
	const fifth = { letters: 4, semitones: fifthSemitones };
	const top = seventhOrSixth(family, rest);
	return top ? [root, third, fifth, top] : [root, third, fifth];
}

/**
 * @param {import('./chordFamily.js').Family} family
 * @param {string} rest
 * @returns {Interval | null}
 */
function seventhOrSixth(family, rest) {
	if (family === 'dominant' || family === 'halfDim') return { letters: 6, semitones: 10 };
	if (family === 'dim7') return { letters: 6, semitones: 9 };
	if (/(maj7|M7|Δ)/.test(rest)) return { letters: 6, semitones: 11 };
	if (/^(m|min|-)7/.test(rest)) return { letters: 6, semitones: 10 };
	if (/6/.test(rest)) return { letters: 5, semitones: 9 };
	return null;
}

/**
 * A mode on the key's tonic, as notes, one per letter.
 * @param {import('./modes.js').ModeId} mode
 * @param {Key} key
 * @returns {Note[]}
 */
export function scaleOfMode(mode, key) {
	return MODES[mode].scale.map((semitones, letters) => moveNote(key.tonic, { letters, semitones }));
}

/**
 * @param {Note} root
 * @param {number[][]} intervals [letters, semitones] above the root
 * @returns {Scale}
 */
function fromIntervals(root, intervals) {
	return described(
		root,
		intervals.map(([letters, semitones]) => moveNote(root, { letters, semitones }))
	);
}

/**
 * @param {Note} root
 * @param {Note[]} notes
 * @returns {Scale}
 */
function described(root, notes) {
	const semitones = notes.map((note) => mod12(notePc(note) - notePc(root)));
	return { notes, semitones, name: scaleName(semitones) };
}
