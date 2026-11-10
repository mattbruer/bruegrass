/**
 * An edited bass line spelled in another key (when the song's key is
 * named): every note at the same pitch, written with the new key signature.
 */
import { readBassScore } from './readBass.js';
import { rewriteAbc, withKeySignature } from '../melody/roll/scoreToAbc.js';

/**
 * @param {string} abc the edited bass line
 * @param {{ keyText: string, spelling: import('../theory/musicInKey.js').Key }} key the concert key
 * @returns {Promise<string>} unchanged if it can't be read
 */
export async function respellBass(abc, key) {
	const read = await readBassScore(abc);
	if (!read || read.problem) return abc;
	const { score } = read;
	const text = rewriteAbc(abc, { ...score, key: key.spelling }, score.notes, { every: true });
	return withKeySignature(text, `${key.keyText} clef=bass`);
}
