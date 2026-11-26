/**
 * A guitar pattern: what you changed about how the guitar plays one chord
 * (instruments/guitarEdits.js: the shape, booms, chucks, run notes and
 * accents and the fill), taken to use on
 * another chord, in this song or any other.
 *
 * Onto the same chord, all of it comes. Onto another chord only the right
 * hand travels: which strings each chuck strums and the accents, beat by
 * beat, and the run notes moved by the distance between the roots (a G
 * walk G A B is C D E on a C). That chord keeps its own shape and booms.
 */
import { rootPitchClass, OPEN_MIDI, MAX_FRET } from './guitar.js';
import { FILL_RANGE } from './guitarFill.js';
import { withoutBass, withoutVariant } from './chordBook.js';

/**
 * @typedef {import('./guitarEdits.js').GuitarChange} GuitarChange
 * @typedef {import('./guitarEdits.js').PickedNote} PickedNote
 * @typedef {{ chord: string, change: GuitarChange }} GuitarPattern
 *   chord: the chord it was made on, as written; change: what was changed there
 */

/**
 * @param {string} chord as written
 * @param {GuitarChange} change what you've changed about it
 * @returns {GuitarPattern}
 */
export function patternOf(chord, change) {
	const { shape, madeAt, booms, chucks, notes, accents, slurs, strums, fill } = change;
	return { chord, change: { shape, madeAt, booms, chucks, notes, accents, slurs, strums, fill } };
}

/**
 * The pattern as a change to this chord: every part of it on the same
 * chord, the right hand (moved) on another. Parts it doesn't hold go back
 * to the band's on the same chord, and stay as they are on another.
 * @param {GuitarPattern} pattern
 * @param {string} chord the chord it goes onto, as written
 * @returns {GuitarChange}
 */
export function patternOnto(pattern, chord) {
	const { change } = pattern;
	if (chord === pattern.chord) {
		return {
			shape: change.shape,
			madeAt: change.madeAt,
			booms: change.booms,
			chucks: change.chucks,
			notes: change.notes,
			accents: change.accents,
			slurs: change.slurs,
			strums: change.strums,
			fill: change.fill
		};
	}
	const shift = rootShift(pattern.chord, chord);
	return {
		chucks: change.chucks,
		accents: change.accents,
		slurs: change.slurs,
		strums: change.strums,
		madeAt: change.madeAt,
		notes: change.notes?.map((note) => note && movedNote(note, shift)),
		fill: change.fill && movedFill(change.fill, shift)
	};
}

/** Does the pattern hold anything? */
export function isEmptyPattern(/** @type {GuitarPattern} */ pattern) {
	return Object.values(pattern.change).every((part) => part === undefined);
}

/**
 * Semitones from one chord's root to another's, the nearer way (up to a
 * tritone up, else down).
 * @param {string} from
 * @param {string} to
 */
function rootShift(from, to) {
	const root = (/** @type {string} */ name) => rootPitchClass(withoutBass(withoutVariant(name)));
	const up = (((root(to) - root(from)) % 12) + 12) % 12;
	return up > 6 ? up - 12 : up;
}

/**
 * A run note moved by some semitones: on the same string if the fret
 * allows, else on the string where it sits nearest the fret it had (an
 * octave up or down if it would fall off the neck).
 * @param {PickedNote} note
 * @param {number} shift
 * @returns {PickedNote}
 */
export function movedNote(note, shift) {
	const lowest = OPEN_MIDI[0];
	const highest = OPEN_MIDI[OPEN_MIDI.length - 1] + MAX_FRET;
	let pitch = OPEN_MIDI[note.string] + note.fret + shift;
	while (pitch < lowest) pitch += 12; // off the bottom of the neck: an octave up
	while (pitch > highest) pitch -= 12;
	const fits = (/** @type {number} */ string) => {
		const fret = pitch - OPEN_MIDI[string];
		return fret >= 0 && fret <= MAX_FRET;
	};
	if (fits(note.string)) return { string: note.string, fret: pitch - OPEN_MIDI[note.string] };
	const strings = OPEN_MIDI.map((_, string) => string).filter(fits);
	const string = strings.reduce((best, each) =>
		Math.abs(pitch - OPEN_MIDI[each] - note.fret) < Math.abs(pitch - OPEN_MIDI[best] - note.fret)
			? each
			: best
	);
	return { string, fret: pitch - OPEN_MIDI[string] };
}

/**
 * A fill with its notes moved by some semitones, an octave back onto the neck if they'd fall off.
 * @param {import('./guitarFill.js').Fill} fill
 * @param {number} shift
 * @returns {import('./guitarFill.js').Fill}
 */
function movedFill(fill, shift) {
	const { lowest, highest } = FILL_RANGE;
	const notes = fill.notes.map((note) => {
		let midi = note.midi + shift;
		while (midi < lowest) midi += 12;
		while (midi > highest) midi -= 12;
		return { ...note, midi };
	});
	return { ...fill, notes };
}
