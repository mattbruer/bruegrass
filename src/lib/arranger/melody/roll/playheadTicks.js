/**
 * Where the band is, as a place on the piano roll. The band plays the tune
 * with repeats and endings played out; the roll shows it as written. So a
 * time in the music (quarters from bar 1, as follow.js gives it) is found
 * among the notes as played (abcjs's sequence), and taken to that note's
 * place in the written score.
 */
import { walk } from '../abcChords.js';
import { TICKS_PER_QUARTER } from './ticks.js';

const EPSILON = 1e-6;

/**
 * @param {any[][] | null} sequence abcjs.synth.sequence of the tune (null:
 *   a melody shaped like the chart, which is written as it's played)
 * @returns {(time: number) => number | null} ticks on the roll, or null
 *   when the band is somewhere the tune doesn't reach
 */
export function playheadTicks(sequence) {
	if (!sequence) return (time) => (time >= 0 ? time * TICKS_PER_QUARTER : null);
	const { items, pickup } = walk(sequence[0] ?? []);
	return (time) => {
		const played = time + pickup;
		const item = items.find(
			(each) => each.t <= played + EPSILON && played < each.t + each.length - EPSILON
		);
		return item ? (item.src + played - item.t) * TICKS_PER_QUARTER : null;
	};
}
