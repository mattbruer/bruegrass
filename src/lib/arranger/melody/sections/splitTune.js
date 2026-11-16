/**
 * A tune written whole (typed, pasted, drawn before) cut into the chart's
 * sections, in every voice: the chart's bars in play order line up with
 * the tune's bars one for one (bar 1 with bar 1), and each section takes
 * its bars. A section repeated with `as` takes the bars of its first time
 * through. A pickup is kept apart, before the first section: it starts the
 * song, not a section (a section played again mustn't play it again).
 *
 * Only a tune written straight through can be cut this way: repeats and
 * endings would need playing out first. Things the piano roll can't write
 * (ornaments, grace notes, slurs) aren't cut either. Words aren't kept
 * with the tune: by section, they come from the chart.
 */
import { readScore } from '../roll/readScore.js';
import { isPickup } from '../roll/scoreToAbc.js';
import { barEvents, writeBar } from '../roll/writeBar.js';
import { TICKS_PER_QUARTER } from '../roll/ticks.js';
import { barLines } from './sectionRests.js';
import { readTuneText } from './tuneBySection.js';

/** Repeats or endings in the music (`|:`, `:|`, `::`, `[1`, `|2`). */
const REPEATS = /\|:|:\||::|\[\d|\|\d/;
/** A header or field line (`K:G`, `w:` words). */
const FIELD_LINE = /^[A-Za-z]:/;

/**
 * @typedef {import('../roll/readScore.js').Score} Score
 * @typedef {import('./tuneBySection.js').TuneBySection} TuneBySection
 */

/**
 * @param {string} abc
 * @param {any} tune abcjs's parse of it
 * @param {import('./tuneBySection.js').SectionInstance[]} instances the chart's sections in play order
 * @param {number[]} barCounts how many bars each instance has in the chart
 * @returns {{ tune: TuneBySection | null, problem: string }}
 */
export function splitTune(abc, tune, instances, barCounts) {
	const refuse = (/** @type {string} */ problem) => ({ tune: null, problem });
	const text = readTuneText(abc);
	if (!text) return refuse('It has no K: line.');
	if (REPEATS.test(musicLines(abc))) return refuse('It has repeats or endings.');

	const total = barCounts.reduce((sum, count) => sum + count, 0);
	/** @type {TuneBySection} */
	const split = { header: text.header, voices: text.voices, leads: {}, parts: {} };
	for (const [index, id] of text.ids.entries()) {
		const { score, problem } = readScore(abc, tune, index);
		if (problem) return refuse(`It has ${problem}.`);
		const pickup = score.bars.length > 0 && isPickup(score, 0) ? 1 : 0;
		if (score.bars.length - pickup > total) return refuse('It has more bars than the chart.');
		splitVoice(score, pickup, id, instances, barCounts, split);
	}
	return { tune: split, problem: '' };
}

/**
 * One voice's bars shared out among the sections (into `split`).
 * @param {Score} score
 * @param {number} pickup 1 when the first bar is a pickup
 * @param {string} id the voice
 * @param {import('./tuneBySection.js').SectionInstance[]} instances
 * @param {number[]} barCounts
 * @param {TuneBySection} split
 */
function splitVoice(score, pickup, id, instances, barCounts, split) {
	const write = (/** @type {import('../roll/readScore.js').ScoreBar} */ bar, isPickup = false) =>
		writeBar(bar, barEvents(bar, score.notes, score.chords), {
			key: score.key,
			unit: score.unit,
			pickup: isPickup
		});
	if (pickup) split.leads[id] = `${write(score.bars[0], true)} |`;
	let at = pickup;
	instances.forEach(({ source }, index) => {
		const bars = score.bars.slice(at, at + barCounts[index]);
		at += barCounts[index];
		if (split.parts[source]?.[id] !== undefined || !hasNotes(score, bars)) return;
		const music = barLines(bars.map((bar) => write(bar)));
		split.parts[source] = { ...split.parts[source], [id]: music };
	});
}

/**
 * Any notes in these bars (a section of rests has no tune of its own: it
 * plays the chart's rests, and follows the chart's chords).
 * @param {Score} score
 * @param {import('../roll/readScore.js').ScoreBar[]} bars
 */
function hasNotes(score, bars) {
	if (bars.length === 0) return false;
	const from = bars[0].start;
	const to = bars.at(-1).start + bars.at(-1).length;
	return score.notes.some((note) => note.start >= from && note.start < to);
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

/** @param {string} abc the music lines alone (no header, no words) */
function musicLines(abc) {
	return abc
		.split('\n')
		.filter((line) => !FIELD_LINE.test(line.trim()))
		.join('\n');
}
