/**
 * An arrangement made from a transcription: the sections you choose, in
 * the recording's order, each with its chords, words and tune. From there
 * it's an ordinary song, rearranged in the arranger; its tune is kept by
 * section, so it follows the chart.
 *
 * A recording often has two sections with the same name (a verse sung
 * twice to different words). In an arrangement a second line with the
 * same name repeats the first, so each gets a name of its own first:
 * "Verse", "Verse 2".
 */
import { sectionBlocks } from '../chart/sectionBlocks.js';
import { uniqueName } from '../state/uniqueName.js';

const SECTION_LINE = /^\s*"([^"]+)"(.*)$/;
/** Fields at the start of the first section line that last the whole song (`[M:3/4]`, `[K:G]`). */
const SONG_FIELDS = /^(\s*\[[KM]:[^\]]*\])+/;

/**
 * The chart with each section line named uniquely.
 * @param {string} chart
 */
export function withUniqueSectionNames(chart) {
	/** @type {string[]} */
	const taken = [];
	return chart
		.split('\n')
		.map((line) => {
			const match = line.match(SECTION_LINE);
			if (!match) return line;
			const name = uniqueName(match[1], taken);
			taken.push(name);
			return `"${name}"${match[2]}`;
		})
		.join('\n');
}

/**
 * The chosen sections of a chart (each with the lines under it), in order.
 * The song's own time and key, written on the first line, stay at the start.
 * @param {string} chart
 * @param {number[]} chosen section indexes
 */
export function chartOfSections(chart, chosen) {
	const groups = sectionGroups(chart);
	const songFields = groups[0]?.[0].match(SECTION_LINE)?.[2].match(SONG_FIELDS)?.[0] ?? '';
	const kept = groups.filter((_, index) => chosen.includes(index));
	if (kept.length === 0) return '';
	const [first, ...rest] = kept[0];
	const [, name, content] = /** @type {RegExpMatchArray} */ (first.match(SECTION_LINE));
	const fields = SONG_FIELDS.test(content) ? '' : songFields;
	return [[`"${name}"${fields}${content}`, ...rest], ...kept.slice(1)]
		.map((lines) => lines.join('\n'))
		.join('\n');
}

/**
 * Just these sections' tunes (and pickups).
 * @param {import('../melody/sections/tuneBySection.js').TuneBySection} tune
 * @param {string} chart the arrangement's chart
 */
export function tuneOfChart(tune, chart) {
	const names = new Set(sectionBlocks(chart).map((block) => block.name));
	const keep = (/** @type {Record<string, any>} */ record) =>
		Object.fromEntries(Object.entries(record).filter(([name]) => names.has(name)));
	return { ...tune, parts: keep(tune.parts), pickups: keep(tune.pickups) };
}

/**
 * Each section line with the lines under it (lines before the first are dropped).
 * @param {string} chart
 */
function sectionGroups(chart) {
	/** @type {string[][]} */
	const groups = [];
	for (const line of chart.split('\n')) {
		if (SECTION_LINE.test(line)) groups.push([line.trim()]);
		else if (line.trim() && groups.length > 0) groups.at(-1)?.push(line.trim());
	}
	return groups;
}
