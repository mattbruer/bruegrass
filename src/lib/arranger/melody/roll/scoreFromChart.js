/**
 * An empty score shaped like the chart, for drawing a melody over a song
 * that has none yet: the chart's bars in play order, its chords at concert
 * pitch (as the ABC will write them), nothing written yet.
 */
import { concertChord } from '../../chart/concertChords.js';
import { TICKS_PER_QUARTER } from './ticks.js';

/** The unit note length a new tune is written in: an eighth (L:1/8). */
const NEW_TUNE_UNIT = TICKS_PER_QUARTER / 2;

/**
 * @param {import('../../chart/chartBars.js').ChartBar[]} chartBars
 * @param {import('../../chart/key.js').Key | null} songKey
 * @param {number} capo
 * @param {import('../../theory/musicInKey.js').Key} spelling
 * @returns {{ score: import('./readScore.js').Score, lineStarts: Set<number> }}
 *   lineStarts: bars that begin a section
 */
export function scoreFromChart(chartBars, songKey, capo, spelling) {
	let meter = { num: 4, den: 4 };
	const bars = [];
	const chords = [];
	const lineStarts = new Set();

	for (const bar of chartBars) {
		if (bar.meter) meter = meterOf(bar.meter);
		const start = bar.start * TICKS_PER_QUARTER;
		bars.push({ start, length: bar.beats * TICKS_PER_QUARTER, meter, from: null, to: null });
		if (bar.sectionStart) lineStarts.add(bar.index);

		let at = start;
		for (const chord of bar.chords) {
			chords.push({ at, name: concertChord(chord.name, songKey, capo) });
			at += chord.length * TICKS_PER_QUARTER;
		}
	}
	return { score: { bars, notes: [], chords, unit: NEW_TUNE_UNIT, key: spelling }, lineStarts };
}

/** @param {string} text e.g. "3/4" */
function meterOf(text) {
	const [num, den] = text.split('/').map(Number);
	return { num, den };
}
