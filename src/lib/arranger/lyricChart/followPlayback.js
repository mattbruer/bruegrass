/**
 * A Svelte action: while the band plays, light up the bar being played
 * (class `playing` on the element with its `data-bar`, inside an element
 * marked `data-sheet`: a page) and bring that page into view.
 */
import { onEveryFrame } from '../playback/analysis/frameLoop.js';

/**
 * @typedef {{ timeNow: () => number, bars: { index: number, start: number, beats: number }[] }} FollowParams
 *   timeNow: quarter notes from bar 1, NaN when stopped
 * @param {HTMLElement} node holds the chart
 * @param {FollowParams} params
 */
export function followPlayback(node, params) {
	let current = params;
	let litIndex = -1;
	/** @type {Element | null} */
	let lit = null;

	const stop = onEveryFrame(() => {
		const index = barAt(current.bars, current.timeNow());
		if (index === litIndex) return;
		litIndex = index;
		lit?.classList.remove('playing');
		// Inside a page: a paper layout keeps another copy off screen to measure
		lit = index < 0 ? null : node.querySelector(`[data-sheet] [data-bar="${index}"]`);
		lit?.classList.add('playing');
		lit
			?.closest('[data-sheet]')
			?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
	});

	return {
		/** @param {FollowParams} next */
		update(next) {
			current = next;
		},
		destroy() {
			stop();
			lit?.classList.remove('playing');
		}
	};
}

/**
 * @param {FollowParams['bars']} bars
 * @param {number} time
 */
export function barAt(bars, time) {
	if (!Number.isFinite(time)) return -1;
	return bars.findIndex((bar) => time >= bar.start && time < bar.start + bar.beats);
}
