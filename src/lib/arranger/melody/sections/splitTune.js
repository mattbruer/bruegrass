/**
 * A tune written whole (typed, pasted, drawn before) cut into the chart's
 * sections: the chart's bars in play order line up with the tune's bars
 * one for one (bar 1 with bar 1), and each section takes its bars. A
 * pickup stays before the first section, with the header: it starts the
 * song, not the section (a section played again mustn't play it again). A section repeated with `as` takes the
 * bars of its first time through.
 *
 * Only a tune written straight through can be cut this way: repeats and
 * endings would need playing out first. Things the piano roll can't write
 * (ornaments, grace notes, slurs) and harmony parts aren't cut either.
 * Words under the tune don't come along yet.
 */
import { readScore } from '../roll/readScore.js';
import { isPickup } from '../roll/scoreToAbc.js';
import { barEvents, writeBar } from '../roll/writeBar.js';
import { TICKS_PER_QUARTER } from '../roll/ticks.js';
import { voiceChannels } from '../harmony/partChannels.js';
import { barLines } from './sectionRests.js';

/** Repeats or endings in the music (`|:`, `:|`, `::`, `[1`, `|2`). */
const REPEATS = /\|:|:\||::|\[\d|\|\d/;
/** A header or field line (`K:G`, `w:` words). */
const FIELD_LINE = /^[A-Za-z]:/;

/**
 * @param {string} abc
 * @param {any} tune abcjs's parse of it
 * @param {import('./tuneBySection.js').SectionInstance[]} instances the chart's sections in play order
 * @param {number[]} barCounts how many bars each instance has in the chart
 * @returns {{ tune: import('./tuneBySection.js').TuneBySection | null, problem: string }}
 */
export function splitTune(abc, tune, instances, barCounts) {
	const refuse = (/** @type {string} */ problem) => ({ tune: null, problem });
	if (voiceChannels(tune).length > 1) return refuse('It has harmony parts.');
	if (REPEATS.test(musicLines(abc))) return refuse('It has repeats or endings.');
	const { score, problem } = readScore(abc, tune, 0);
	if (problem) return refuse(`It has ${problem}.`);

	const pickup = score.bars.length > 0 && isPickup(score, 0) ? 1 : 0;
	const total = barCounts.reduce((sum, count) => sum + count, 0);
	if (score.bars.length - pickup > total) return refuse('It has more bars than the chart.');

	/** @type {Record<string, string>} */
	const parts = {};
	let at = pickup;
	const write = (/** @type {import('../roll/readScore.js').ScoreBar} */ bar, isPickup = false) =>
		writeBar(bar, barEvents(bar, score.notes, score.chords), {
			key: score.key,
			unit: score.unit,
			pickup: isPickup
		});
	instances.forEach(({ source }, index) => {
		const bars = score.bars.slice(at, at + barCounts[index]);
		at += barCounts[index];
		if (source in parts || bars.length === 0) return;
		parts[source] = barLines(bars.map((bar) => write(bar)));
	});
	const pickupBar = pickup ? [`${write(score.bars[0], true)} |`] : [];
	return { tune: { header: [headerOf(abc), ...pickupBar].join('\n'), parts }, problem: '' };
}

/**
 * The ticks in a header's unit note length (L:), an eighth if it names none.
 * @param {string} header
 */
export function unitOfHeader(header) {
	const match = header.match(/^L:\s*(\d+)\s*\/\s*(\d+)/m);
	const whole = match ? Number(match[1]) / Number(match[2]) : 1 / 8;
	return whole * 4 * TICKS_PER_QUARTER;
}

/**
 * The header: the field lines before the music starts (a `P:` line, which
 * would order parts, left out).
 * @param {string} abc
 */
function headerOf(abc) {
	const lines = abc.split('\n');
	const end = lines.findIndex((line) => line.trim() && !FIELD_LINE.test(line.trim()));
	return (end === -1 ? lines : lines.slice(0, end))
		.filter((line) => line.trim() && !/^P:/.test(line.trim()))
		.join('\n');
}

/** @param {string} abc the music lines alone (no header, no words) */
function musicLines(abc) {
	return abc
		.split('\n')
		.filter((line) => !FIELD_LINE.test(line.trim()))
		.join('\n');
}
