/**
 * The tune's pickup, the short bar before bar 1, set to any length on a
 * tune already written: added, made longer or shorter (at its front, so
 * its notes keep their place before bar 1), or taken away. Every voice
 * gets the same. Bar 1 and everything after it stay as written. A change
 * that would cut off notes is refused, never made.
 */
import { TICKS_PER_QUARTER } from './ticks.js';
import { isPickup, rewriteAbc } from './scoreToAbc.js';
import { echoZone, withPickupEcho } from './pickupEcho.js';
import { isShortBar } from './rollLayout.js';
import { barEvents, lengthText, writeBar } from './writeBar.js';

/** @typedef {import('./readScore.js').Score} Score */

/**
 * How long the tune's pickup is now (quarters; 0: none), read from its first voice.
 * @param {Score[]} scores each voice's score
 */
export function pickupLength(scores) {
	const first = scores[0];
	if (!first?.bars.length || !isPickup(first, 0)) return 0;
	return first.bars[0].length / TICKS_PER_QUARTER;
}

/**
 * @param {string} abc
 * @param {Score[]} scores each voice's score, read from abc
 * @param {number} quarters the pickup's new length (0: none)
 * @returns {{ abc: string, blocked: boolean }} blocked: notes would be cut off, so nothing changed
 */
export function withPickupLength(abc, scores, quarters) {
	const ticks = Math.round(quarters * TICKS_PER_QUARTER);
	const edits = [];
	for (const score of scores) {
		const first = score.bars[0];
		if (!first || first.from === null || first.to === null) continue;
		if (!isPickup(score, 0)) {
			if (ticks > 0) edits.push(addedPickup(abc, first.from, ticks, score.unit));
			continue;
		}
		const cut = first.length - ticks;
		if (score.notes.some((note) => note.start < Math.max(cut, 0))) return { abc, blocked: true };
		edits.push(
			ticks > 0
				? resizedPickup(abc, score, first, ticks)
				: { from: first.from, to: afterBarLine(abc, first.to), text: '' }
		);
	}
	let text = abc;
	for (const edit of edits.toSorted((a, b) => b.from - a.from)) {
		text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
	}
	return { abc: text, blocked: false };
}

/**
 * A rest bar before a voice's bar 1. It goes before a bar line or repeat
 * sign that opens the music (`|:`), so it isn't played again on the
 * repeat; that sign then ends it.
 * @param {string} abc
 * @param {number} at where bar 1's notes start
 * @param {number} ticks
 * @param {number} unit
 */
function addedPickup(abc, at, ticks, unit) {
	const lineStart = abc.lastIndexOf('\n', at - 1) + 1;
	const opening = abc.slice(lineStart, at).match(/[|:[\]]+\s*$/);
	const from = opening ? at - opening[0].length : at;
	const rest = `z${lengthText(ticks, unit)}`;
	return { from, to: from, text: opening ? `${rest} ` : `${rest} | ` };
}

/**
 * The pickup rewritten at its new length, measured back from bar 1.
 * @param {string} abc
 * @param {Score} score
 * @param {import('./readScore.js').ScoreBar} pickup
 * @param {number} ticks
 */
function resizedPickup(abc, score, pickup, ticks) {
	const from = /** @type {number} */ (pickup.from);
	const to = /** @type {number} */ (pickup.to);
	const bar = { ...pickup, start: pickup.length - ticks, length: ticks };
	const events = barEvents(bar, score.notes, score.chords);
	const music = writeBar(bar, events, {
		key: bar.key ?? score.key,
		unit: score.unit,
		pickup: true
	});
	const old = abc.slice(from, to);
	const lead = old.match(/^\s*/)?.[0] ?? '';
	const trail = old.match(/\s*$/)?.[0] || ' ';
	return { from, to, text: lead + music + trail };
}

/**
 * Just past the plain bar line that ends a bar (not a repeat sign, which
 * belongs to the next bar).
 * @param {string} abc
 * @param {number} at where the bar's notes end
 */
function afterBarLine(abc, at) {
	const barLine = abc.slice(at).match(/^\s*\|(?![:|\]])\s*/);
	return barLine ? at + barLine[0].length : at;
}

/**
 * The tune as sheet music shows it (never saved): the pickup ends with a
 * double bar line (`||`), so it stands apart from bar 1 (only a plain bar
 * line is changed; a repeat sign after the pickup stays). And since the tune
 * goes round, the pickup's notes are written again in the last bar's closing
 * beats, leading back to the top, where that bar only has rests there.
 * @param {string} abc
 * @param {Score[]} scores each voice's score, read from abc
 * @returns {import('../textEdits.js').TextEdit[]} to make in abc (textEdits.js)
 */
export function pickupEditsOnPaper(abc, scores) {
	/** @type {import('../textEdits.js').TextEdit[]} */
	const edits = [];
	for (const score of scores) {
		const first = score.bars[0];
		if (!first || !isPickup(score, 0)) continue;
		const barLine = first.to === null ? null : abc.slice(first.to).match(/^\s*\|(?![:|\]])/);
		if (first.to !== null && barLine) {
			const at = first.to + barLine[0].length;
			edits.push({ from: at, to: at, put: '|' });
		}
		const end = pickupAtTheEnd(abc, score);
		if (end) edits.push(end);
	}
	return edits;
}

/**
 * The last bar with the pickup's notes in its closing beats (null: it has
 * notes of its own there, or no room).
 * @param {string} abc
 * @param {Score} score
 */
function pickupAtTheEnd(abc, score) {
	const zone = echoZone(score.bars, isShortBar);
	const last = score.bars.at(-1);
	if (!zone || !last || last.from === null || last.to === null) return null;
	const busy = score.notes.some(
		(note) => note.start < zone.to && note.start + note.length > zone.from
	);
	if (busy) return null;
	const echoes = withPickupEcho(score.notes, zone)
		.filter((note) => note.echo)
		.map(({ midi, start, length }) => ({ midi, start, length }));
	const written = rewriteAbc(abc, score, [...score.notes, ...echoes]);
	const grown = written.length - abc.length;
	return { from: last.from, to: last.to, put: written.slice(last.from, last.to + grown) };
}
