/**
 * Moving a whole part up or down an octave: every note, rhythm untouched.
 */
import { PIANO_ROWS } from './pitchRows.js';

export const OCTAVE = 12;

/**
 * @template {{ midi: number }} N
 * @param {N[]} notes
 * @param {number} semitones
 * @returns {N[]}
 */
export function transposed(notes, semitones) {
	return notes.map((note) => ({ ...note, midi: note.midi + semitones }));
}

/**
 * Would every note still be on the piano's keys?
 * @param {{ midi: number }[]} notes
 * @param {number} semitones
 */
export function staysOnPiano(notes, semitones) {
	return notes.every(
		(note) =>
			note.midi + semitones >= PIANO_ROWS.lowest && note.midi + semitones <= PIANO_ROWS.highest
	);
}
