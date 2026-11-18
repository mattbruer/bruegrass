/**
 * Puts each guitar sample in tune as it's played: its measured fix
 * (guitarSampleFixes.js) as a playback-rate factor, multiplied into the
 * rate the note already plays at.
 */
import { GUITAR_SAMPLE_FIXES } from './guitarSampleFixes.js';
import { STRINGS } from './guitar.js';

/**
 * @param {number} string index into STRINGS
 * @param {number} fret
 * @param {boolean} inTune false plays the sample as recorded (for comparing by ear)
 */
export function tuningFix(string, fret, inTune) {
	const cents = inTune ? (GUITAR_SAMPLE_FIXES[`${STRINGS[string]}${fret}`] ?? 0) : 0;
	return 2 ** (cents / 1200);
}
