/**
 * Scale degrees written the way the Berklee text writes them (docs/theory/chord-scales.md):
 * "1 T9 3 S4 5 T13 T7". A plain number is a chord tone, T a tension, S a
 * scale approach (an avoid note), each counted in semitones above the chord's root.
 */

/** @typedef {'tone' | 'tension' | 'approach'} Role */
/** @typedef {{ semitones: number, role: Role, label: string }} Degree */

const SEMITONES = {
	1: 0,
	b2: 1,
	b9: 1,
	2: 2,
	9: 2,
	'#9': 3,
	b3: 3,
	3: 4,
	b4: 4,
	4: 5,
	11: 5,
	'#4': 6,
	'#11': 6,
	b5: 6,
	5: 7,
	'#5': 8,
	b6: 8,
	b13: 8,
	6: 9,
	13: 9,
	bb7: 9,
	b7: 10,
	7: 11
};

const ROLES = { T: 'tension', S: 'approach' };

/**
 * @param {string} text e.g. "1 T9 3 S4 5 T13 b7"
 * @returns {Degree[]}
 */
export function readDegrees(text) {
	return text.split(/\s+/).filter(Boolean).map(readDegree);
}

/** @param {string} word e.g. "T#11", "S4", "b3" */
function readDegree(word) {
	const role = /** @type {Role} */ (ROLES[/** @type {'T' | 'S'} */ (word[0])] ?? 'tone');
	const label = role === 'tone' ? word : word.slice(1);
	const semitones = SEMITONES[/** @type {keyof SEMITONES} */ (label)];
	if (semitones === undefined) throw new Error(`Unknown degree: ${word}`);
	return { semitones, role, label };
}
