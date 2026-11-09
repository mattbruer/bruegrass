/**
 * The melody's key, from the song's key (chart/key.js: the chart's [K:],
 * else its first chord). The chart names the key of the guitar's shapes;
 * the melody is written at concert pitch, so the capo moves it: G shapes
 * with capo 2 is a tune in A.
 */
import { keyName } from '../../chart/key.js';
import { majorKey } from '../../theory/musicInKey.js';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * @param {import('../../chart/key.js').Key | null} songKey
 * @param {number} capo
 * @returns {{ keyText: string, spelling: import('../../theory/musicInKey.js').Key, tonic: number }}
 *   keyText: the ABC K: field ("A", "F#m"); spelling: the major key with the
 *   same signature (what writing notes needs); tonic: its pitch class
 */
export function melodyKey(songKey, capo) {
	if (!songKey) return { keyText: 'C', spelling: majorKey('C'), tonic: 0 };
	const keyText = keyName(songKey, capo);
	const relativeMajor = keyName({ ...songKey, minor: false }, capo + (songKey.minor ? 3 : 0));
	const tonic = majorKey(keyName({ ...songKey, minor: false }, capo)).pc;
	return { keyText, spelling: majorKey(relativeMajor), tonic };
}

/**
 * Is this pitch one of the key's seven notes?
 * @param {import('../../theory/musicInKey.js').Key} spelling
 * @param {number} midi
 */
export function isInKey(spelling, midi) {
	return MAJOR_SCALE.includes((((midi - spelling.pc) % 12) + 12) % 12);
}
