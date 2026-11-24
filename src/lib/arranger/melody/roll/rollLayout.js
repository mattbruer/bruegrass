/**
 * What the piano roll and the TAB view share about time across: how wide
 * a tick is, and how bars are numbered (a pickup first bar, short or
 * marked so, is "Pickup", and the next bar is 1).
 */
import { TICKS_PER_QUARTER } from './ticks.js';

/** Pixels per quarter note: wider when the grid is finer. */
const QUARTER_WIDTH = { coarse: 64, fine: 96 };

/**
 * @param {number} gridStep the grid's step in ticks
 * @param {number} zoomAcross
 */
export function tickWidthFor(gridStep, zoomAcross) {
	const quarter = gridStep < TICKS_PER_QUARTER / 2 ? QUARTER_WIDTH.fine : QUARTER_WIDTH.coarse;
	return (quarter * zoomAcross) / TICKS_PER_QUARTER;
}

/** @param {import('./readScore.js').ScoreBar | undefined} bar */
export function isShortBar(bar) {
	return Boolean(bar) && bar.length < (bar.meter.num * 4 * TICKS_PER_QUARTER) / bar.meter.den;
}

/**
 * @param {import('./readScore.js').ScoreBar[]} bars
 * @param {number} index
 * @param {boolean} [pickupBar] the first bar is a pickup though it's a whole bar (Transcribe's Pickup bar)
 */
export function barLabel(bars, index, pickupBar = false) {
	const pickup = pickupBar || isShortBar(bars[0]);
	if (pickup && index === 0) return 'Pickup';
	return String(pickup ? index : index + 1);
}
