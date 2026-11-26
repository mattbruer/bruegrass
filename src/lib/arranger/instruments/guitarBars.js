/**
 * Several chords' guitar changes copied as one and pasted from another
 * chord on, one after the next (a few bars of strums to use elsewhere).
 * Each chord goes as a pattern would (guitarPatterns.js): all of it onto
 * the same chord, the right hand moved onto another.
 */
import { editedGuitar, withGuitarEdit } from './guitarEdits.js';
import { isEmptyPattern, patternOf, patternOnto } from './guitarPatterns.js';

/**
 * @typedef {{ name: string, editAt: number }} ChordPlace
 */

/**
 * What you've changed on each of these chords, in order.
 * @param {ChordPlace[]} chords
 * @param {import('./guitarEdits.js').GuitarEdits} edits
 * @returns {import('./guitarPatterns.js').GuitarPattern[]}
 */
export function copiedBars(chords, edits) {
	return chords.map(({ name, editAt }) => patternOf(name, editedGuitar(edits, editAt, name)));
}

/** @param {import('./guitarPatterns.js').GuitarPattern[]} patterns */
export function hasChanges(patterns) {
	return patterns.some((pattern) => !isEmptyPattern(pattern));
}

/**
 * The edits with each pattern laid onto the chord at its place in `chords`
 * (as many as there are chords left).
 * @param {import('./guitarEdits.js').GuitarEdits} edits
 * @param {ChordPlace[]} chords the chords from where it's pasted on
 * @param {import('./guitarPatterns.js').GuitarPattern[]} patterns
 * @returns {import('./guitarEdits.js').GuitarEdits}
 */
export function pasteBars(edits, chords, patterns) {
	return chords.slice(0, patterns.length).reduce((now, { name, editAt }, i) => {
		const change = { ...editedGuitar(now, editAt, name), ...patternOnto(patterns[i], name) };
		return withGuitarEdit(now, editAt, name, change);
	}, edits);
}
