/**
 * The piano roll's rows, high to low: each pitch the guitar plays a melody
 * on, laid out like a piano's keys whatever the song's key (black or white),
 * plus whether it's in the key (marked on its name, so a tune can stay in
 * tune), and its name spelled in the key.
 */
import { melodyNote, spell } from '../../theory/musicInKey.js';
import { isInKey } from './melodyKey.js';

/**
 * @typedef {{ lowest: number, highest: number }} RowRange written pitches (concert, as ABC writes them)
 */

/** Every part's rows: a piano's 88 keys, A0 to C8, whatever the instrument can reach. */
export const PIANO_ROWS = { lowest: 21, highest: 108 };
/** Where each part usually plays, so an empty roll opens there. The guitar's open low E up to the high e's 12th fret. */
export const MELODY_ROWS = { lowest: 52, highest: 88 };
/** The bass's open E and a little below (bassline.js numbering, as its ABC writes it), up past its G string's fifth fret. */
export const BASS_ROWS = { lowest: 36, highest: 62 };
/** Generic lanes: any instrument, from the bass's lowest to the melody's highest. */
export const LANE_ROWS = { lowest: BASS_ROWS.lowest, highest: MELODY_ROWS.highest };
const MIDDLE_C = 60;
/** C♯, D♯, F♯, G♯, A♯ (pitch classes). */
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
/** C and F: white keys with a white key just below (B, E), no black key between. */
const WHITE_KEY_BELOW = new Set([0, 5]);

/**
 * @param {import('../../theory/musicInKey.js').Key} spelling the key signature's major key
 * @param {RowRange} [range]
 * @returns {{ midi: number, black: boolean, whiteKeyBelow: boolean, inKey: boolean, name: string }[]}
 */
export function pitchRows(spelling, range = PIANO_ROWS) {
	const rows = [];
	for (let midi = range.highest; midi >= range.lowest; midi--) {
		const pitchClass = ((midi % 12) + 12) % 12;
		rows.push({
			midi,
			black: BLACK_KEYS.has(pitchClass),
			whiteKeyBelow: WHITE_KEY_BELOW.has(pitchClass),
			inKey: isInKey(spelling, midi),
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
