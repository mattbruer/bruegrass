/**
 * The piano roll's rows, high to low: each pitch the guitar plays a melody
 * on, whether it's in the key (shaded, so a tune drawn on those rows stays
 * in tune), whether it's the home note, and its name spelled in the key.
 */
import { melodyNote, spell } from '../../theory/musicInKey.js';
import { isInKey } from './melodyKey.js';

/**
 * @typedef {{ lowest: number, highest: number }} RowRange written pitches (concert, as ABC writes them)
 */

/** The guitar's open low E up to the high e's 12th fret. */
export const MELODY_ROWS = { lowest: 52, highest: 88 };
/** The bass's open E and a little below (bassline.js numbering, as its ABC writes it), up past its G string's fifth fret. */
export const BASS_ROWS = { lowest: 36, highest: 62 };
const MIDDLE_C = 60;

/**
 * @param {import('../../theory/musicInKey.js').Key} spelling the key signature's major key
 * @param {number} tonic the home note's pitch class
 * @param {RowRange} [range]
 * @returns {{ midi: number, inKey: boolean, home: boolean, name: string }[]}
 */
export function pitchRows(spelling, tonic, range = MELODY_ROWS) {
	const rows = [];
	for (let midi = range.highest; midi >= range.lowest; midi--) {
		rows.push({
			midi,
			inKey: isInKey(spelling, midi),
			home: ((midi % 12) + 12) % 12 === tonic,
			name: noteName(spelling, midi)
		});
	}
	return rows;
}

/**
 * "F#4", "Bb3": the note as the key spells it, with its octave.
 * @param {import('../../theory/musicInKey.js').Key} spelling
 * @param {number} midi
 */
function noteName(spelling, midi) {
	const { letter, accidental } = spell(
		spelling,
		melodyNote(spelling, midi - MIDDLE_C - spelling.pc, 1)
	);
	const sign = accidental > 0 ? '♯' : accidental < 0 ? '♭' : '';
	const octave = Math.floor((midi - accidental) / 12) - 1;
	return `${letter}${sign}${octave}`;
}
