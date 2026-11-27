/**
 * A part is written once but may be played more than once (repeats,
 * endings). This says every place a written stretch sounds, in quarters from
 * bar 1 (the Tracks lanes' time). The other way is melody/roll/playheadTicks.js.
 */
import { walk } from '../melody/abcChords.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

const EPSILON = 1e-6;

/**
 * @typedef {{ from: number, to: number }} Span quarters from bar 1
 */

/**
 * @param {any[][] | null} sequence abcjs's sequence of the tune (null: written as played, like the bass)
 * @param {number} from written ticks
 * @param {number} to
 * @returns {Span[]} in play order, touching ones joined
 */
export function playedSpans(sequence, from, to) {
	const start = from / TICKS_PER_QUARTER;
	const stop = to / TICKS_PER_QUARTER;
	if (!sequence) return [{ from: start, to: stop }];
	const { items, pickup } = walk(sequence[0] ?? []);
	/** @type {Span[]} */
	const spans = [];
	for (const item of items) {
		const itemFrom = Math.max(item.src, start);
		const itemTo = Math.min(item.src + item.length, stop);
		if (itemTo - itemFrom < EPSILON) continue;
		const played = {
			from: item.t - pickup + itemFrom - item.src,
			to: item.t - pickup + itemTo - item.src
		};
		const last = spans.at(-1);
		if (last && Math.abs(last.to - played.from) < EPSILON) last.to = played.to;
		else spans.push(played);
	}
	return spans;
}
