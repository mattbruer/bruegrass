/**
 * A chord name with its notes as pitch classes, so F# and Gb (as a capo
 * move or a new key may spell them) count as the same chord.
 */

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SIGNS = { '#': 1, '♯': 1, b: -1, '♭': -1 };

/**
 * @param {string} name e.g. "F#m7/C#"
 * @returns {string} e.g. "6m7/1"
 */
export function chordBySound(name) {
	return name.replace(/(^|\/)([A-G])([#♯b♭]?)/g, (_, slash, letter, sign) => {
		const pc = (LETTERS[/** @type {keyof LETTERS} */ (letter)] + (SIGNS[sign] ?? 0) + 12) % 12;
		return `${slash}${pc}`;
	});
}
