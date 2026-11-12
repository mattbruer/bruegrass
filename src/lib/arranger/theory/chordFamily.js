/**
 * What a chord is, for analysis: its family (from the quality after the
 * root), whether the key has it, and which mode it's borrowed from if not.
 * A mode's chords are its sevenths stacked in thirds (theory/modes.js).
 */
import { BORROWED_FROM, MODES, OWN_MODES } from './modes.js';

/**
 * @typedef {'triad' | 'major' | 'minor' | 'dominant' | 'halfDim' | 'dim' | 'dim7' | 'aug'} Family
 *   triad: a plain major triad (or sus), which can act as a dominant;
 *   major: maj7 or 6, which can't
 * @typedef {{ steps: number, offset: number }} Degree see key.js degree
 */

/**
 * @param {string} rest what follows the root: "", "m7", "maj7", "7b9", "m7b5", "dim7"
 * @returns {Family}
 */
export function chordFamily(rest) {
	if (/^(dim7|°7|o7)/.test(rest)) return 'dim7';
	if (/^(m7b5|m7\(b5\)|min7b5|-7b5|ø)/.test(rest)) return 'halfDim';
	if (/^(dim|°|o)/.test(rest)) return 'dim';
	if (/^(aug|\+)/.test(rest)) return 'aug';
	if (/^(maj|M|Δ|6)/.test(rest)) return 'major';
	if (/^(m|min|-)/.test(rest)) return 'minor';
	if (/^(7|9|11|13)/.test(rest)) return 'dominant';
	return 'triad';
}

/** @param {Family} family */
export function canBeDominant(family) {
	return family === 'dominant' || family === 'triad' || family === 'aug';
}

const DIMINISHED = ['dim', 'dim7', 'halfDim'];
const MAJOR_SCALE = MODES.ionian.scale;

/* A seventh chord's third, fifth and seventh above its root, and the families that name it (its triad too) */
const FAMILIES_OF_SEVENTH = /** @type {Record<string, Family[]>} */ ({
	'4,7,11': ['triad', 'major'],
	'4,7,10': ['triad', 'dominant'],
	'3,7,10': ['minor'],
	'3,7,11': ['minor'],
	'3,6,10': ['halfDim', 'dim'],
	'3,6,9': ['dim', 'dim7'],
	'4,8,11': ['aug'],
	'4,8,10': ['aug']
});

/**
 * A degree as a lookup key: "1:0" is II, "6:-1" is bVII.
 * @param {Degree} degree
 */
const degreeKey = ({ steps, offset }) => `${steps}:${offset}`;

/**
 * Each degree of a mode, and the families of the chord built on it.
 * @param {number[]} scale
 */
function chordsOfMode(scale) {
	/** @type {Map<string, Family[]>} */
	const chords = new Map();
	scale.forEach((root, step) => {
		const above = [2, 4, 6].map((letters) => (scale[(step + letters) % 7] - root + 12) % 12);
		const degree = { steps: step, offset: root - MAJOR_SCALE[step] };
		chords.set(degreeKey(degree), FAMILIES_OF_SEVENTH[above.join(',')] ?? []);
	});
	return chords;
}

const MODE_CHORDS = new Map(
	Object.entries(MODES).map(([id, mode]) => [id, chordsOfMode(mode.scale)])
);

/**
 * @param {import('./modes.js').ModeId} mode
 * @param {Degree} degree
 */
function familiesOn(mode, degree) {
	return MODE_CHORDS.get(mode)?.get(degreeKey(degree)) ?? [];
}

/** @param {boolean} minor */
const keyType = (minor) => (minor ? 'minor' : 'major');

/**
 * @param {Degree} degree
 * @param {Family} family
 * @param {boolean} minor which key's chords
 */
export function inKey(degree, family, minor) {
	return OWN_MODES[keyType(minor)].some((mode) => familiesOn(mode, degree).includes(family));
}

/**
 * The mode a chord outside the key is borrowed from, or null if none has it.
 * @param {Degree} degree
 * @param {Family} family
 * @param {boolean} minor
 * @returns {import('./modes.js').ModeId | null}
 */
export function borrowedFrom(degree, family, minor) {
	return (
		BORROWED_FROM[keyType(minor)].find((mode) => familiesOn(mode, degree).includes(family)) ?? null
	);
}

/**
 * Whether the key has a chord on this degree that a dominant can lead to
 * (not a diminished one: VII in major, II in minor).
 * @param {Degree} degree
 * @param {boolean} minor
 */
export function canBeTarget(degree, minor) {
	return OWN_MODES[keyType(minor)].some((mode) =>
		familiesOn(mode, degree).some((family) => !DIMINISHED.includes(family))
	);
}
