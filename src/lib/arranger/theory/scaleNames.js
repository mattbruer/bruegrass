/**
 * What a scale is called, from its notes' semitones above its root. Plain
 * data: the modes, and the altered scales jazz players reach for over
 * chords from outside the key.
 */
import { MODES } from './modes.js';

const OTHER_SCALES = [
	{ name: 'Mixolydian ♭13', scale: [0, 2, 4, 5, 7, 8, 10] },
	{ name: 'Mixolydian ♭9 ♭13 (Phrygian dominant)', scale: [0, 1, 4, 5, 7, 8, 10] },
	{ name: 'Lydian ♭7 (Lydian dominant)', scale: [0, 2, 4, 6, 7, 9, 10] },
	{ name: 'Locrian ♮2', scale: [0, 2, 3, 5, 6, 8, 10] },
	{ name: 'altered', scale: [0, 1, 3, 4, 6, 8, 10] },
	{ name: 'Lydian augmented', scale: [0, 2, 4, 6, 8, 9, 11] },
	{ name: 'Dorian ♯4', scale: [0, 2, 3, 6, 7, 9, 10] },
	{ name: 'whole-half diminished', scale: [0, 2, 3, 5, 6, 8, 9, 11] }
];

const NAMED_SCALES = [...Object.values(MODES), ...OTHER_SCALES];

/**
 * @param {number[]} semitones above the root, rising
 * @returns {string | null} null for a scale with no common name
 */
export function scaleName(semitones) {
	const found = NAMED_SCALES.find(
		({ scale }) =>
			scale.length === semitones.length && scale.every((step, i) => step === semitones[i])
	);
	return found?.name ?? null;
}
