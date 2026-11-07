/**
 * Write harmony parts into ABC notation (see writeHarmonies.js), reading
 * the notation with abcjs, which is loaded on first use.
 */
import { withHarmonies } from './writeHarmonies.js';

/**
 * @param {string} notation
 * @param {import('./writeHarmonies.js').ChordAt} chordAt
 * @param {string[]} partIds
 * @returns {Promise<{ abc: string, problem: string }>}
 */
export async function harmonizeAbc(notation, chordAt, partIds) {
	const { default: abcjs } = await import('abcjs');
	const [tune] = abcjs.parseOnly(notation);
	if (!tune) return { abc: notation, problem: 'The melody has no music to harmonise.' };
	return withHarmonies(notation, tune, chordAt, partIds);
}
