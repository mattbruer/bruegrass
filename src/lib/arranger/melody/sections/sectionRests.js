/**
 * What a section with no tune yet plays: a rest in every bar, with the
 * chart's chords on them (at concert pitch), so the sheet music and the
 * piano roll show the section's bars and chords, ready to draw on.
 */
import { scoreFromChart } from '../roll/scoreFromChart.js';
import { barEvents, writeBar } from '../roll/writeBar.js';

/** Bars on a line of a section's tune. */
const BARS_PER_LINE = 4;

/**
 * @param {import('../../chart/chartBars.js').ChartBar[]} bars the section's bars, in play order
 * @param {{ songKey: import('../../chart/key.js').Key | null, capo: number,
 *   spelling: import('../../theory/musicInKey.js').Key, unit: number }} song
 *   unit: ticks in the tune's unit note length (L:)
 * @returns {string} ABC bars
 */
export function sectionRests(bars, { songKey, capo, spelling, unit }) {
	const { score } = scoreFromChart(bars, songKey, capo, spelling);
	const written = score.bars.map((bar) =>
		writeBar(bar, barEvents(bar, [], score.chords), { key: spelling, unit })
	);
	return barLines(written);
}

/**
 * Bars written as lines of a section's tune: `a | b | c | d |`.
 * @param {string[]} bars each bar's music
 */
export function barLines(bars) {
	const lines = [];
	for (let at = 0; at < bars.length; at += BARS_PER_LINE)
		lines.push(`${bars.slice(at, at + BARS_PER_LINE).join(' | ')} |`);
	return lines.join('\n');
}
