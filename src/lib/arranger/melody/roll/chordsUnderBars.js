/**
 * The chart's chords under each bar of the score, so a melody is drawn
 * against what the band plays. The melody's bar 1 starts with the chart's
 * bar 1 (melody.js), so a written bar's place on the chart is when it is
 * first played: repeats and endings played out, the pickup before bar 1.
 */
import { walk } from '../abcChords.js';
import { TICKS_PER_QUARTER } from './ticks.js';

const EPSILON = 1e-6;

/**
 * @typedef {{ at: number, length: number, name: string }} ChordUnder
 *   at/length in ticks of the score; name as the chart writes it
 */

/**
 * @param {import('./readScore.js').Score} score
 * @param {any[][] | null} sequence abcjs.synth.sequence of the score's ABC (null: a score from the chart)
 * @param {import('../../chart/chartBars.js').ChartBar[]} chartBars
 * @returns {ChordUnder[]}
 */
export function chordsUnderBars(score, sequence, chartBars) {
	const timeOf = sequence ? playedTimes(sequence) : null;
	return score.bars.flatMap((bar) => {
		const time = timeOf ? timeOf(bar) : bar.start / TICKS_PER_QUARTER;
		if (time === null) return [];
		return chordsBetween(chartBars, time, time + bar.length / TICKS_PER_QUARTER).map((chord) => ({
			at: bar.start + Math.round((chord.start - time) * TICKS_PER_QUARTER),
			length: Math.round(chord.length * TICKS_PER_QUARTER),
			name: chord.name
		}));
	});
}

/**
 * When each written bar is first played, in quarters from bar 1.
 * @param {any[][]} sequence
 */
function playedTimes(sequence) {
	const { items, pickup } = walk(sequence[0] ?? []);
	/** @param {import('./readScore.js').ScoreBar} bar */
	return (bar) => {
		const first = items.find((item) => item.startChar === bar.from);
		return first ? first.t - pickup : null;
	};
}

/**
 * The chart's chords sounding between two times, clipped to them.
 * @param {import('../../chart/chartBars.js').ChartBar[]} chartBars
 * @param {number} from
 * @param {number} to
 */
function chordsBetween(chartBars, from, to) {
	const chords = [];
	for (const bar of chartBars) {
		let start = bar.start;
		for (const chord of bar.chords) {
			const end = start + chord.length;
			if (end > from + EPSILON && start < to - EPSILON) {
				const clipped = Math.max(start, from);
				chords.push({ name: chord.name, start: clipped, length: Math.min(end, to) - clipped });
			}
			start = end;
		}
	}
	return chords;
}
