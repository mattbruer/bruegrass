/**
 * The guitar's chord book: the one place a chord name becomes a shape.
 * The song's style says how (styles/styles.js `voicing`): bluegrass looks in
 * guitar-chords.json, then builds a shape from the chord's notes, so any chord
 * the theory knows can be played; Celtic has its own generator. A shape of your own for one chord of a song is a change to
 * how the guitar plays it there (guitarEdits.js), not the book's.
 *
 * A name can carry a variant after a colon, `G:high`: what the chord
 * is (root, fifth, slash bass) is read from the name before it, and the
 * book plays the plain chord's shape.
 */
import { BLUEGRASS_BOOK_CHORDS } from '../styles/bluegrass/bluegrassVoicing.js';
import { DEFAULT_STYLE, styleOf } from '../styles/styles.js';

/** @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted */

/**
 * Chord shape as written (no capo), low E to high e.
 * @param {string} name e.g. "G", "G/B", "G:high", "Cadd9"
 * @param {string} [style] the song's style (styles/styles.js)
 * @returns {Shape}
 */
export function chordShape(name, style = DEFAULT_STYLE) {
	const shape = findShape(name, style);
	if (!shape) throw new Error(`No guitar shape for ${name}`);
	return shape;
}

/**
 * @param {string} name
 * @param {string} [style]
 */
export function hasShape(name, style = DEFAULT_STYLE) {
	return findShape(name, style) !== undefined;
}

/**
 * @param {string} name
 * @param {string} style
 */
function findShape(name, style) {
	const chord = withoutVariant(withoutBass(name));
	return styleOf(style).voicing(chord) ?? undefined;
}

/** Every chord in bluegrass's open-position book. */
export const BUILT_IN_CHORDS = BLUEGRASS_BOOK_CHORDS;

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
