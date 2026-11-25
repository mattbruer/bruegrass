/**
 * Bluegrass's guitar shapes for a chord: the open-position book first
 * (guitar-chords.json), then one built from the chord's notes.
 */
import builtIn from '../../instruments/guitar-chords.json';
import { generatedShape } from '../../instruments/guitarVoicing.js';

/**
 * @param {string} chord a plain chord name, no slash bass or variant
 * @returns {import('../styles.js').Shape | null}
 */
export function bluegrassShape(chord) {
	return (
		/** @type {Record<string, import('../styles.js').Shape>} */ (builtIn)[chord] ??
		generatedShape(chord)
	);
}

/** Every chord the open-position book has a shape for. */
export const BLUEGRASS_BOOK_CHORDS = Object.keys(builtIn);
