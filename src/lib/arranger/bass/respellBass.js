/**
 * An edited bass line spelled in another key (when the song's key is
 * named): every note at the same pitch, written with the new key signature.
 */
import { rewriteAbc, withKeySignature } from '../melody/roll/scoreToAbc.js';

/**
 * @param {string} abc the edited bass line
 * @param {import('./readBass.js').ReadBass | null} read that line, read
 * @param {{ keyText: string, spelling: import('../theory/musicInKey.js').Key }} key the concert key
 * @returns {string} unchanged if it can't be read
 */
export function respellBass(abc, read, key) {
	if (!read || read.problem) return abc;
	const { score } = read;
	const text = rewriteAbc(abc, { ...score, key: key.spelling }, score.notes, { every: true });
	return withKeySignature(text, `${key.keyText} clef=bass`);
}
