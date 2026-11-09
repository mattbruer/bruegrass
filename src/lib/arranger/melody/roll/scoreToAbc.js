/**
 * The drawn notes back into ABC. With ABC already there, only the bars
 * whose music changed are rewritten, in place, so everything else stays as
 * typed. With none yet, a whole tune is written from the chart's bars.
 */
import { barEvents, writeBar } from './writeBar.js';
import { TICKS_PER_QUARTER } from './ticks.js';

/** Bars per line in a tune written from scratch (a new section also starts a line). */
const BARS_PER_LINE = 4;

/**
 * @typedef {import('./readScore.js').Score} Score
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 */

/**
 * @param {string} abc the ABC the score was read from
 * @param {Score} score
 * @param {DrawnNote[]} notes the notes as drawn now
 * @param {{ every?: boolean }} [options] every: rewrite every bar (for a new key signature)
 */
export function rewriteAbc(abc, score, notes, { every = false } = {}) {
	let text = abc;
	const changed = changedBars(score, notes);
	const bars = score.bars.map((bar, index) => ({ bar, index })).reverse();
	for (const { bar, index } of bars) {
		if (bar.from === null || bar.to === null) continue;
		if (!every && !changed.has(index)) continue;

		const after = barEvents(bar, notes, score.chords);
		const old = text.slice(bar.from, bar.to);
		const lead = old.match(/^\s*/)?.[0] ?? '';
		const trail = old.match(/\s*$/)?.[0] ?? '';
		const music = writeBar(bar, after, {
			key: score.key,
			unit: score.unit,
			pickup: isPickup(score, index)
		});
		text = text.slice(0, bar.from) + lead + music + trail + text.slice(bar.to);
	}
	return text;
}

/**
 * The bars (indexes) whose music these notes change.
 * @param {Score} score
 * @param {DrawnNote[]} notes
 * @returns {Set<number>}
 */
export function changedBars(score, notes) {
	const changed = new Set();
	score.bars.forEach((bar, index) => {
		const before = barEvents(bar, score.notes, score.chords);
		const after = barEvents(bar, notes, score.chords);
		if (JSON.stringify(before) !== JSON.stringify(after)) changed.add(index);
	});
	return changed;
}

/**
 * A whole tune: header, then every bar.
 * @param {Score} score bars not yet written (from scoreFromChart)
 * @param {DrawnNote[]} notes
 * @param {{ title: string, keyText: string, lineStarts: Map<number, string> }} header
 *   keyText: the K: field ("G", "Em"); lineStarts: bars that begin a section, with its name
 */
export function newAbc(score, notes, { title, keyText, lineStarts }) {
	const first = score.bars[0]?.meter ?? { num: 4, den: 4 };
	const lines = [];
	let line = '';
	let meter = `${first.num}/${first.den}`;
	let barsOnLine = 0;

	score.bars.forEach((bar, index) => {
		const sectionName = lineStarts.get(index);
		const sectionStart = index > 0 && sectionName !== undefined;
		const breaks = index > 0 && (sectionStart || barsOnLine === BARS_PER_LINE);
		if (breaks) {
			lines.push(`${line}${sectionStart ? '||' : '|'}`);
			line = '';
			barsOnLine = 0;
		}
		if (sectionName) lines.push(`P:${sectionName}`);
		const barMeter = `${bar.meter.num}/${bar.meter.den}`;
		const change = barMeter !== meter ? `[M:${barMeter}] ` : '';
		meter = barMeter;
		const music = writeBar(bar, barEvents(bar, notes, score.chords), {
			key: score.key,
			unit: score.unit
		});
		line += `${line ? '| ' : ''}${change}${music} `;
		barsOnLine += 1;
	});
	if (line) lines.push(`${line}|]`);

	const unitWhole = `1/${(4 * TICKS_PER_QUARTER) / score.unit}`;
	return [
		'X:1',
		...(title ? [`T:${title}`] : []),
		`M:${first.num}/${first.den}`,
		`L:${unitWhole}`,
		`K:${keyText}`,
		...lines,
		''
	].join('\n');
}

/**
 * The ABC with a new key signature (K:), for a respelling in a new key.
 * @param {string} abc
 * @param {string} keyText
 */
export function withKeySignature(abc, keyText) {
	return abc.replace(/^K:.*$/m, `K:${keyText}`);
}

/**
 * Is this the short bar before bar 1?
 * @param {Score} score
 * @param {number} index
 */
function isPickup(score, index) {
	const bar = score.bars[index];
	return index === 0 && bar.length < (bar.meter.num * 4 * TICKS_PER_QUARTER) / bar.meter.den;
}
