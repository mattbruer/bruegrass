/**
 * Where each instrument naturally plays, in the numbering its part is
 * written in (the bass: bassline.js's, open E = 40). A new instrument is
 * one entry.
 * @typedef {import('../melody/roll/pitchRows.js').RowRange} RowRange
 */

/** The upright's open E up to the octave G on its G string, without thumb position. */
export const UPRIGHT_RANGE = { lowest: 40, highest: 67 };

/**
 * @param {number} midi
 * @param {RowRange} range
 */
export function isOutside(midi, range) {
	return midi < range.lowest || midi > range.highest;
}
