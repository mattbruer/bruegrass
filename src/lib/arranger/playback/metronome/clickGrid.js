/**
 * Where the metronome clicks fall, in quarter notes from the top of a pass:
 * one click per quarter, the first of each bar accented. Alone, it's 4/4;
 * with the song, it follows the song's bars.
 */
import { barQuarters, rhythm } from '../../chart/timeline.js';

/**
 * @typedef {{ at: number, accent: boolean }} Click
 * @typedef {{ lengthQuarters: number, beats: Click[] }} ClickGrid
 *   lengthQuarters: one pass; beats repeat every pass
 */

/**
 * @param {import('../../chart/timeline.js').Section[]} sections
 * @returns {ClickGrid}
 */
export function songClickGrid(sections) {
	const { beats, quarters } = rhythm(sections);
	return {
		lengthQuarters: quarters,
		beats: beats.map(({ time, beatInBar }) => ({ at: time, accent: beatInBar === 0 }))
	};
}

/**
 * A steady click on its own, one bar long: a click on every beat of the
 * meter (a beat is a quarter, or an eighth in x/8), the first accented.
 * @param {import('../../chart/timeline.js').Meter} meter
 * @returns {ClickGrid}
 */
export function soloClickGrid(meter) {
	const beatQuarters = 4 / meter.unit;
	return {
		lengthQuarters: barQuarters(meter),
		beats: Array.from({ length: meter.beats }, (_, i) => ({
			at: i * beatQuarters,
			accent: i === 0
		}))
	};
}
