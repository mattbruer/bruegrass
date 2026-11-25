/**
 * The guitar's chord book: the one place a chord name becomes a shape.
 * The built-in ones in guitar-chords.json first, then a shape built from
 * the chord's notes (guitarVoicing.js), so any chord the theory knows can
 * be played. A shape of your own for one chord of a song is a change to
 * how the guitar plays it there (guitarEdits.js), not the book's.
 *
 * A name can still carry a variant after a colon, `G:high`: what the chord
 * is (root, fifth, slash bass) is read from the name before it, and the
 * book plays the plain chord's shape.
 */
import builtIn from './guitar-chords.json';
import { generatedShape } from './guitarVoicing.js';

/** @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted */

/**
 * Chord shape as written (no capo), low E to high e.
 * @param {string} name e.g. "G", "G/B", "G:high", "Cadd9"
 * @returns {Shape}
 */
export function chordShape(name) {
	const shape = findShape(name);
	if (!shape) throw new Error(`No guitar shape for ${name}`);
	return shape;
}

/** @param {string} name */
export function hasShape(name) {
	return findShape(name) !== undefined;
}

/** @param {string} name */
function findShape(name) {
	const chord = withoutVariant(withoutBass(name));
	return (
		/** @type {Record<string, Shape>} */ (builtIn)[chord] ?? generatedShape(chord) ?? undefined
	);
}

/** Every built-in chord name. */
export const BUILT_IN_CHORDS = Object.keys(builtIn);

/**
 * The chord without a slash bass: "G/B" → "G", "G:high/B" → "G:high".
 * @param {string} name
 */
export function withoutBass(name) {
	return name.split('/')[0];
}

/**
 * The chord without its variant: "G:high/B" → "G/B".
 * @param {string} name
 */
export function withoutVariant(name) {
	return name.replace(/:[^/]*/, '');
}
