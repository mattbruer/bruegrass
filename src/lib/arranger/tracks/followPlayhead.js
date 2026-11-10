/**
 * A Svelte action for the tracks' playhead: every frame, put it where the
 * band is, hide it when stopped, and keep it in view by scrolling the
 * tracks when it runs off the visible part.
 */
import { onEveryFrame } from '../playback/analysis/frameLoop.js';

/** Where the playhead lands after a scroll, as a share of the visible width. */
const LAND_AT = 1 / 3;

/**
 * @typedef {{ timeNow: () => number, toX: (quarters: number) => number, scroller: HTMLElement | undefined, headerWidth: number }} PlayheadParams
 *   timeNow: quarter notes from bar 1, NaN when stopped; toX: pixels into the lanes
 * @param {HTMLElement} node the playhead line
 * @param {PlayheadParams} params
 */
export function followPlayhead(node, params) {
	let current = params;

	const stop = onEveryFrame(() => {
		const time = current.timeNow();
		node.hidden = !Number.isFinite(time);
		if (node.hidden) return;
		const x = current.toX(time);
		node.style.transform = `translateX(${x}px)`;
		keepInView(x);
	});

	/** @param {number} x */
	function keepInView(x) {
		const scroller = current.scroller;
		if (!scroller) return;
		const visible = scroller.clientWidth - current.headerWidth;
		if (x >= scroller.scrollLeft && x < scroller.scrollLeft + visible) return;
		scroller.scrollLeft = x - visible * LAND_AT;
	}

	return {
		/** @param {PlayheadParams} next */
		update(next) {
			current = next;
		},
		destroy: stop
	};
}
