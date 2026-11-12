/**
 * How one chord's root moves to the next, and notes found by stepping
 * down from a root, spelled by letter (a fifth below A is D, a half step
 * below Ab is G).
 */
import { mod12, notePc } from '../chart/key.js';

/**
 * @typedef {import('../chart/key.js').Note} Note
 * @typedef {{ root: Note }} HasRoot
 * @typedef {{ letters: number, semitones: number }} Interval
 */

export const A_FIFTH_BELOW = { letters: -4, semitones: -7 };
export const A_HALF_STEP_BELOW = { letters: -1, semitones: -1 };

/**
 * Semitones from one chord's root up to the next one's (0–11).
 * @param {HasRoot} from
 * @param {HasRoot} to
 */
function semitonesUp(from, to) {
	return mod12(notePc(to.root) - notePc(from.root));
}

/** A7 → D: the strongest motion, a dominant resolving. */
export const fallsAFifth = (/** @type {HasRoot} */ from, /** @type {HasRoot} */ to) =>
	semitonesUp(from, to) === 5;

/** Ab7 → G: how a tritone substitute resolves. */
export const slidesDownAHalfStep = (/** @type {HasRoot} */ from, /** @type {HasRoot} */ to) =>
	semitonesUp(from, to) === 11;

/** G#°7 → Am: a passing chord leading up. */
export const risesAHalfStep = (/** @type {HasRoot} */ from, /** @type {HasRoot} */ to) =>
	semitonesUp(from, to) === 1;

export const sameRoot = (/** @type {HasRoot} */ from, /** @type {HasRoot} */ to) =>
	semitonesUp(from, to) === 0;

/**
 * The note an interval away (negative: below), on the right letter.
 * @param {Note} note
 * @param {Interval} interval
 * @returns {Note}
 */
export function moveNote(note, { letters, semitones }) {
	const letter = (note.letter + letters + 7) % 7;
	const pitch = notePc(note) + semitones;
	const accidental = mod12(pitch - notePc({ letter, accidental: 0 }) + 6) - 6;
	return { letter, accidental };
}
