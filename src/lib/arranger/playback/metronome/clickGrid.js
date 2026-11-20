/**
 * Where the metronome clicks fall, in quarter notes from the top of a pass:
 * one click per quarter. With the song, the first of each bar is accented;
 * alone, it's a straight click.
 */
import { rhythm } from '../../chart/timeline.js';

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
 * A straight click on its own: every beat the same, no bars.
 * @returns {ClickGrid}
 */
export function steadyClickGrid() {
	return { lengthQuarters: 1, beats: [{ at: 0, accent: false }] };
}
