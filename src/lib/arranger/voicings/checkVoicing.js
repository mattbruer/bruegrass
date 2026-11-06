/**
 * Will a shape play? The guitar needs a root (and the note that alternates
 * with it) for the boom, and at least one of the strum strings.
 */
import { STRINGS, STRUM_STRINGS, bassNoteIn } from '../instruments/guitar.js';

/** A chord name: a capital letter first, nothing that means something else in the chart. */
const CHORD_NAME = /^[A-G][#b]?[^\s,|/"[\]]*$/;

/**
 * @param {string} name
 * @param {string[]} takenNames your other shapes' names
 * @returns {string} what's wrong, or ''
 */
export function nameProblem(name, takenNames) {
	if (name === '') return 'Give it the chord name you’ll write in the chart';
	if (name.includes('/')) return 'Leave out the slash bass: write G:high/B in the chart instead';
	if (!CHORD_NAME.test(name))
		return 'Start with a capital A–G, with no spaces, commas or | (like Cadd9 or G:high)';
	if (takenNames.includes(name)) return `You already have a shape called ${name}`;
	return '';
}

/**
 * @param {string} name
 * @param {(number | null)[]} frets
 * @returns {string} what's wrong, or ''
 */
export function shapeProblem(name, frets) {
	if (!STRUM_STRINGS.some((string) => frets[string] !== null)) {
		const names = STRUM_STRINGS.map((string) => STRINGS[string].replace('ee', 'high e'));
		return `Play at least one of the ${names.join(', ')} strings, for the strum`;
	}
	try {
		bassNoteIn(frets, name, 'root');
		bassNoteIn(frets, name, 'fifth');
	} catch (problem) {
		return problem instanceof Error ? problem.message : String(problem);
	}
	return '';
}
