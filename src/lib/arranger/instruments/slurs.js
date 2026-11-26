/**
 * A slur on one beat of a chord: two notes on one string, the second not
 * picked. A hammer-on sounds the lower fret with the beat, then part-way
 * through the finger lands on the higher one; a pull-off sounds the higher
 * fret with the beat, then the finger pulls off and the lower one sounds.
 * Either way the second note is a little quieter, having no pick. A slur
 * is on one string: a boom's own string, its fret the higher one; on a
 * chuck, a string you choose (one it strums), the shape's fret the higher
 * one (components/guitar/SlurPicker.svelte).
 *
 * The capo comes for free: guitar.js adds it to every fret.
 */

/** How far into the beat the second note comes: 0.5 is the "and"; nearer 0 is more of a grace note. */
export const SLUR_LANDS_AT = 0.5;
/** The second note against the strum's own level. */
export const SLUR_DB = -2;

/**
 * @typedef {{ string: number, low: number, pull: boolean }} SlurEdit
 *   what you chose: the string, the lower fret (open is 0), and whether it's a pull-off (else a hammer-on)
 * @typedef {{ string: number, from: number, to: number }} Slur
 *   the fret sounded with the beat, and the fret it changes to
 */

/**
 * The slur a choice makes (null: no higher fret to hammer to or pull from).
 * @param {SlurEdit | null | undefined} edit
 * @param {(number | null)[]} shape
 * @param {{ string: number, fret: number } | null} [boom] the beat's boom: the slur is on its string, its fret the higher
 * @returns {Slur | null}
 */
export function slurOf(edit, shape, boom = null) {
	if (!edit) return null;
	const string = boom ? boom.string : edit.string;
	const high = boom ? boom.fret : shape[string];
	if (high === null || high === undefined || high <= edit.low) return null;
	return edit.pull ? { string, from: high, to: edit.low } : { string, from: edit.low, to: high };
}

/**
 * The choice that makes this slur (to change one part of it).
 * @param {Slur} slur
 * @returns {SlurEdit}
 */
export function editOf(slur) {
	return { string: slur.string, low: Math.min(slur.from, slur.to), pull: slur.from > slur.to };
}

/**
 * What a new slur starts as, with the lower fret open: on a chuck's D string if it
 * strums it and the shape frets it, else the lowest such string.
 * @param {(number | null)[]} shape
 * @param {number[]} strings the strings it can be on
 * @param {boolean} pull
 * @returns {SlurEdit | null}
 */
export function startingSlur(shape, strings, pull) {
	const D_STRING = 2;
	const fretted = strings.filter((string) => (shape[string] ?? 0) > 0);
	const string = fretted.includes(D_STRING) ? D_STRING : fretted[0];
	return string === undefined ? null : { string, low: 0, pull };
}
