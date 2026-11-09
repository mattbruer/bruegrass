/**
 * An empty score shaped like the chart, for drawing a melody over a song
 * that has none yet: the chart's bars in play order, its chords at concert
 * pitch (as the ABC will write them), nothing written yet.
 */
import { concertChord } from '../../chart/concertChords.js';
import { barsInPlayOrder } from '../../chart/chartBars.js';
import { TICKS_PER_QUARTER } from './ticks.js';

/** The unit note length a new tune is written in: an eighth (L:1/8). */
const NEW_TUNE_UNIT = TICKS_PER_QUARTER / 2;

/**
 * The empty score for the open song: its bars in play order, chords at
 * concert pitch, spelled in the melody's key.
 * @param {{ arrangement: { sections: import('../../chart/timeline.js').Section[], key: any, capoFret: number }, melodyKey: { spelling: any } }} arranger
 * @param {number} [pickupQuarters] a short bar before bar 1 this long (0: none)
 */
export function blankScoreForSong({ arrangement, melodyKey }, pickupQuarters = 0) {
	const bars = barsInPlayOrder(arrangement.sections);
	return scoreFromChart(
		bars,
		arrangement.key,
		arrangement.capoFret,
		melodyKey.spelling,
		pickupQuarters
	);
}

/**
 * @param {import('../../chart/chartBars.js').ChartBar[]} chartBars
 * @param {import('../../chart/key.js').Key | null} songKey
 * @param {number} capo
 * @param {import('../../theory/musicInKey.js').Key} spelling
 * @param {number} [pickupQuarters] a short bar before bar 1; times then count from it
 * @returns {{ score: import('./readScore.js').Score, lineStarts: Set<number> }}
 *   lineStarts: bars that begin a section
 */
export function scoreFromChart(chartBars, songKey, capo, spelling, pickupQuarters = 0) {
	let meter = { num: 4, den: 4 };
	const bars = [];
	const chords = [];
	const lineStarts = new Set();
	const pickup = pickupQuarters * TICKS_PER_QUARTER;

	if (pickup > 0) {
		if (chartBars[0]?.meter) meter = meterOf(chartBars[0].meter);
		bars.push({ start: 0, length: pickup, meter, from: null, to: null });
	}
	const barShift = pickup > 0 ? 1 : 0;

	for (const bar of chartBars) {
		if (bar.meter) meter = meterOf(bar.meter);
		const start = bar.start * TICKS_PER_QUARTER + pickup;
		bars.push({ start, length: bar.beats * TICKS_PER_QUARTER, meter, from: null, to: null });
		if (bar.sectionStart && !(barShift && bar.index === 0)) lineStarts.add(bar.index + barShift);

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
