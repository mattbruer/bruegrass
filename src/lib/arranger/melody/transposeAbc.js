import { loadAbcjs } from './abcjs.js';

/**
 * Rewrite ABC notation in another key: notes, key signature and chord
 * symbols (abcjs's own transposer).
 *
 * @param {string} notation
 * @param {number} semitones
 * @returns {Promise<string>}
 */
export async function transposeAbc(notation, semitones) {
	if (semitones === 0 || notation.trim() === '') return notation;
	const abcjs = await loadAbcjs();
	return abcjs.strTranspose(notation, abcjs.parseOnly(notation), semitones);
}
