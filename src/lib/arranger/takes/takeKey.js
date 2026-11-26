/**
 * Takes follow the song's key. A take remembers the key the band sounded
 * in when it was made (`sounds`, a pitch class of the tonic as it sounds,
 * capo and Key setting included); when the song sounds in another key now,
 * the take plays shifted by the difference, its speed kept. This is the one
 * place that turns one into the other.
 */
import { mod12, notePc } from '../chart/key.js';

/**
 * The song's tonic as it sounds, 0 to 11 (null: the chart names no key yet).
 * @param {import('../chart/key.js').Key | null} key the chart's key
 * @param {number} pitchShift capo plus the Key setting
 */
export function soundingTonic(key, pitchShift) {
	return key ? mod12(notePc(key.tonic) + pitchShift) : null;
}

/**
 * How many semitones a take plays shifted to be in the song's key now, the
 * nearer way round (-6 to 5). 0 for a take that doesn't know its key, or
 * a song with none.
 * @param {{ sounds?: number | null }} take
 * @param {number | null} tonicNow
 */
export function semitonesToFollow(take, tonicNow) {
	if (take.sounds === undefined || take.sounds === null || tonicNow === null) return 0;
	return mod12(tonicNow - take.sounds + 6) - 6;
}
