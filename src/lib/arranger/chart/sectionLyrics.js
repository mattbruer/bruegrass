import { sectionBlocks } from './sectionBlocks.js';

/**
 * The words under each section, matched to its bars. Lyric lines go under
 * the section line; `|` starts the next bar:
 *
 *   "Verse"[M:3/4]|G|G|C|G|
 *   A-|ma-zing |grace, how |sweet the |sound that
 *
 * - Words before the section's first `|` are a pickup (sung before bar 1).
 * - Words before the first `|` of a later line carry on the bar before.
 * - A `|` at the end of a line just closes the bar; `| |` is a bar with no words.
 * - Each lyric line starts a new row on the chart.
 * - A section with no lyric lines (`"Break" as Verse`) has no words.
 *
 * @typedef {{ pickup: string, bars: string[], rowStarts: number[] }} SectionLyrics
 *   bars: the words of bar 1, 2, …; rowStarts: the bars that begin a lyric line
 */

/**
 * @param {string} source the arrangement text
 * @returns {SectionLyrics[]} one per section, in the order of parseArrangement's sections
 */
export function readLyrics(source) {
	return sectionBlocks(source).map((block) => lyricsFromLines(block.lines));
}

/**
 * @param {string[]} lines
 * @returns {SectionLyrics}
 */
export function lyricsFromLines(lines) {
	let pickup = '';
	/** @type {string[]} */
	const bars = [];
	/** @type {number[]} */
	const rowStarts = [];

	for (const line of lines) {
		const [before, ...barWords] = line.replace(/\|\s*$/, '').split('|');
		if (bars.length === 0) pickup = joinWords(pickup, before);
		else bars[bars.length - 1] = joinWords(bars[bars.length - 1], before);

		if (barWords.length > 0) rowStarts.push(bars.length);
		bars.push(...barWords.map((words) => words.trim()));
	}

	return { pickup, bars, rowStarts };
}

/** @param {string} a @param {string} b */
function joinWords(a, b) {
	return [a.trim(), b.trim()].filter(Boolean).join(' ');
}

/**
 * The words sung in one bar, for a chart drawn from these sections (which
 * may be a loop region's cut-down copy: see chart/loop.js). Not used yet:
 * it's for words on the scrolling strip (ArrangementStrip), tried and set
 * aside for now; pass the strip `readLyrics(text)` and show this per bar.
 * @param {SectionLyrics[]} lyrics the whole song's
 * @param {import('./loop.js').LoopSection[]} sections what the chart draws
 * @param {{ section: number, measure: number }} bar
 */
export function wordsInBar(lyrics, sections, bar) {
	const section = sections[bar.section];
	const source = section?.source ?? bar.section;
	return lyrics[source]?.bars[bar.measure + (section?.barOffset ?? 0)] ?? '';
}
