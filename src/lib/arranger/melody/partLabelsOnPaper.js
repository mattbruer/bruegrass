/**
 * The section names the sheet music shows. Only on the page.
 *
 * A tune kept by section is put together with a `P:` line per section, so
 * it's already right: an unmarked section's line is kept (it still starts a
 * part) but drawn with no name.
 *
 * A tune kept whole (typed, pasted, a transcription's) has whatever `P:`
 * lines it was written with, which a later marker never reaches. The chart
 * is where sections live, so those lines are left off and each section the
 * chart starts is named at its bar (the chart's bars in play order line up
 * with the tune's one for one, as when a tune is split: splitTune.js).
 */
import { UNMARKED_SECTION } from '../chart/unmarkedSection.js';
import { isPickup } from './roll/scoreToAbc.js';
import { hasRepeats } from './sections/splitTune.js';

/** @param {string} abc */
export function unmarkedPartsUnnamed(abc) {
	return abc
		.split('\n')
		.map((line) => (line.trim() === `P:${UNMARKED_SECTION}` ? 'P:' : line))
		.join('\n');
}

/**
 * @param {string} abc a tune kept whole
 * @param {import('./roll/readScore.js').Score} melody its first voice, read from abc
 * @param {import('../chart/chartBars.js').ChartBar[]} chartBars
 * @returns {import('./textEdits.js').TextEdit[]} none when its bars can't be lined up (repeats)
 */
export function chartPartLabelEdits(abc, melody, chartBars) {
	if (hasRepeats(abc)) return [];
	const pickup = melody.bars.length > 0 && isPickup(melody, 0) ? 1 : 0;
	const labels = chartBars
		.filter((bar) => bar.sectionStart && bar.sectionName !== UNMARKED_SECTION)
		.map((bar) => ({
			at: melody.bars[bar.index === 0 ? 0 : bar.index + pickup]?.from,
			name: bar.sectionName
		}))
		.filter(({ at }) => at !== undefined && at !== null)
		.map(({ at, name }) => ({ from: at, to: at, put: `[P:${name}] ` }));
	return [...partLinesInTheMusic(abc), ...labels];
}

/** The tune's own `P:` lines after its K: line, taken out. @param {string} abc */
function partLinesInTheMusic(abc) {
	const edits = [];
	let at = 0;
	let inMusic = false;
	for (const line of abc.split('\n')) {
		const end = at + line.length + 1;
		if (inMusic && line.trim().startsWith('P:')) edits.push({ from: at, to: end, put: '' });
		if (line.trim().startsWith('K:')) inMusic = true;
		at = end;
	}
	return edits;
}
