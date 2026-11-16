/**
 * A pickup bar added to a tune already written: a short bar of rest before
 * bar 1 in every voice that doesn't have one, to draw the pickup notes in.
 * Bar 1 and everything after it stay where they are.
 */
import { TICKS_PER_QUARTER } from './ticks.js';
import { isPickup } from './scoreToAbc.js';
import { lengthText } from './writeBar.js';

/**
 * Does the tune start with a pickup (its first voice's first bar is short)?
 * @param {import('./readScore.js').Score[]} scores each voice's score
 */
export function hasPickup(scores) {
	const first = scores[0];
	return Boolean(first?.bars.length) && isPickup(first, 0);
}

/**
 * @param {string} abc
 * @param {import('./readScore.js').Score[]} scores each voice's score, read from abc
 * @param {number} quarters how long the pickup is
 */
export function withPickupBar(abc, scores, quarters) {
	const ticks = Math.round(quarters * TICKS_PER_QUARTER);
	if (ticks <= 0) return abc;
	const places = scores
		.filter((score) => score.bars[0]?.from != null && !isPickup(score, 0))
		.map((score) => pickupPlace(abc, /** @type {number} */ (score.bars[0].from), score.unit))
		.toSorted((a, b) => b.at - a.at);
	let text = abc;
	for (const { at, unit, barLine } of places) {
		const rest = `z${lengthText(ticks, unit)}`;
		text = `${text.slice(0, at)}${rest}${barLine ? ' ' : ' | '}${text.slice(at)}`;
	}
	return text;
}

/**
 * Where a voice's pickup goes: before a bar line or repeat sign that opens
 * its music (`|:`), so the pickup isn't played again on the repeat; that
 * sign then ends the pickup bar.
 * @param {string} abc
 * @param {number} at where the first bar's notes start
 * @param {number} unit
 */
function pickupPlace(abc, at, unit) {
	const lineStart = abc.lastIndexOf('\n', at - 1) + 1;
	const opening = abc.slice(lineStart, at).match(/[|:[\]]+\s*$/);
	return opening
		? { at: at - opening[0].length, unit, barLine: true }
		: { at, unit, barLine: false };
}
