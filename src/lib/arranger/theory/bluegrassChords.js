/**
 * Which chords bluegrass plays in a key, as plain data: how unlikely each
 * one is (0: at home), by its root's steps above the key note and whether
 * it's minor. Bluegrass is mostly diatonic, so the key's own chords are at
 * home and any other is suspect: not wrong, but it has to be heard
 * clearly. The few it leans on (♭VII, II as the V of V, III on to IV, VI in the
 * Salty Dog turnaround) are less suspect.
 * A minor chord on I, IV or V counts as unlikely: over a major chord the
 * players often bend to a bluesy flat third, and that mustn't read as a
 * minor chord.
 */
import { majorKey } from './musicInKey.js';

const AT_HOME = 0;
const SUSPECT = 0.05;
const UNLIKELY = 0.1;

/** Steps above the key note ('m': minor) → how unlikely. */
const IN_A_MAJOR_KEY = {
	0: AT_HOME, // I
	'2m': AT_HOME, // ii
	'4m': AT_HOME, // iii
	5: AT_HOME, // IV
	7: AT_HOME, // V
	'9m': AT_HOME, // vi
	2: SUSPECT, // II, the V of V
	4: SUSPECT, // III, usually on to IV (B7 → C in G)
	9: SUSPECT, // VI, the Salty Dog turnaround (I VI II V)
	10: SUSPECT // ♭VII
};
const IN_A_MINOR_KEY = {
	'0m': AT_HOME, // i
	3: AT_HOME, // ♭III
	'5m': AT_HOME, // iv
	'7m': AT_HOME, // v
	7: AT_HOME, // V
	8: AT_HOME, // ♭VI
	10: AT_HOME, // ♭VII
	5: SUSPECT // IV, as in Dorian
};

/**
 * @param {string} key e.g. 'G', 'Bb', 'Em'
 * @returns {(root: number, minor: boolean) => number} root: 0 = C
 */
export function unlikelyInKey(key) {
	const minorKey = key.endsWith('m');
	const tonic = majorKey(minorKey ? key.slice(0, -1) : key).pc;
	const table = minorKey ? IN_A_MINOR_KEY : IN_A_MAJOR_KEY;
	return (root, minor) => {
		const steps = (((root - tonic) % 12) + 12) % 12;
		return /** @type {Record<string, number>} */ (table)[`${steps}${minor ? 'm' : ''}`] ?? UNLIKELY;
	};
}
