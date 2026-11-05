/**
 * Read the arrangement text into sections, or explain what's wrong with it.
 */
import { parseArrangement } from './parseArrangement.js';
import { slotPositions } from './timeline.js';

/**
 * @param {string} text the arrangement as typed
 * @returns {{ sections: import('./timeline.js').Section[], error: string }}
 *   error is '' when the text is fine (sections is then what to play)
 */
export function readArrangement(text) {
	try {
		const sections = parseArrangement(text);
		slotPositions(sections); // throws if a bar has more chords than beats
		return { sections, error: '' };
	} catch (problem) {
		return { sections: [], error: messageOf(problem) };
	}
}

/** @param {unknown} problem */
function messageOf(problem) {
	return problem instanceof Error ? problem.message : String(problem);
}
