/**
 * Changing a chord's name in the chart text. The chord's own reading (its
 * mark) goes with the old chord, so a new chord starts unmarked.
 */
import { rewriteChordAt } from './chordAt.js';

/* Characters that would break the chart's own syntax, or split a chord box */
const NOT_IN_CHORD = /[\s{}|,[\]"]/g;

/**
 * @param {string} source the chart
 * @param {{ section: number, measure: number, chord: number }} place as the parser counts them
 * @param {string} name the new chord as typed, e.g. "D7"
 * @returns {string} the chart with that chord renamed (unchanged if the name is empty)
 */
export function setChord(source, place, name) {
	const clean = name.replace(NOT_IN_CHORD, '');
	if (!clean) return source;
	return rewriteChordAt(source, place, () => clean);
}
