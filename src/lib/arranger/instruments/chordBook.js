/**
 * The guitar's chord book: the one place a chord name becomes a shape.
 * Your own shapes (My chords) come first, then the built-in ones in
 * guitar-chords.json. Voicings built from theory can plug in here later.
 *
 * Your shapes are set for the whole page (by voicings/myChords.svelte.js),
 * so playback, export, MIDI and the capo choice all play the same shapes.
 *
 * A name can have a variant after a colon, `G:high`, so one song can use
 * two shapes of the same chord. The variant only picks the shape: what the
 * chord is (root, fifth, slash bass) is read from the name before it.
 */
import builtIn from './guitar-chords.json';

/** @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted */

/** @type {Record<string, Shape>} */
let yourShapes = {};

/**
 * Use these shapes ahead of the built-in ones, replacing any set before.
 * @param {Record<string, Shape>} shapes by chord name, without a slash bass
 */
export function useYourShapes(shapes) {
	yourShapes = shapes;
}

/**
 * Chord shape as written (no capo), low E to high e.
 * @param {string} name e.g. "G", "G/B", "G:high", "Cadd9"
 * @returns {Shape}
 */
export function chordShape(name) {
	const shape = findShape(name);
	if (!shape) throw new Error(`No guitar shape for ${name}: add one under My chords`);
	return shape;
}

/** @param {string} name */
export function hasShape(name) {
	return findShape(name) !== undefined;
}

/** @param {string} name */
function findShape(name) {
	const chord = withoutBass(name);
	return yourShapes[chord] ?? /** @type {Record<string, Shape>} */ (builtIn)[chord];
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
