/**
 * The tune's pickup, the short bar before bar 1, set to any length on a
 * tune already written: added, made longer or shorter (at its front, so
 * its notes keep their place before bar 1), or taken away. Every voice
 * gets the same. Bar 1 and everything after it stay as written. A change
 * that would cut off notes is refused, never made.
 */
import { TICKS_PER_QUARTER } from './ticks.js';
import { isPickup } from './scoreToAbc.js';
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
	const music = writeBar(bar, events, { key: score.key, unit: score.unit, pickup: true });
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
 * The tune as sheet music shows it: the pickup ends with a double bar line
 * (`||`), so it stands apart from bar 1. Only a plain bar line is changed; a
 * repeat sign after the pickup stays.
 * @param {string} abc
 * @param {Score[]} scores each voice's score, read from abc
 */
export function withPickupDoubleBar(abc, scores) {
	let text = abc;
	const ends = scores
		.filter((score) => score.bars.length > 0 && isPickup(score, 0) && score.bars[0].to !== null)
		.map((score) => /** @type {number} */ (score.bars[0].to))
		.toSorted((a, b) => b - a);
	for (const end of ends) {
		const barLine = text.slice(end).match(/^\s*\|(?![:|\]])/);
		if (barLine) {
			const at = end + barLine[0].length;
			text = `${text.slice(0, at)}|${text.slice(at)}`;
		}
	}
	return text;
}
