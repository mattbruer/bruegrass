import { paginate } from './paginate.js';
import { CONTENT_HEIGHT } from './paper.js';

/** The text is never drawn smaller than this to squeeze a long song onto one page. */
const SMALLEST_FOR_ONE_PAGE = 0.75;
/** Nor smaller than this to avoid clipping a row that is too wide. */
const SMALLEST_EVER = 0.3;
const LARGEST = 2.2;
const SEARCH_STEPS = 7;
const COLUMN_COUNTS = [1, 2];
/** More columns only when they make the text this much larger. */
const WORTH_A_COLUMN = 1.02;

/**
 * @typedef {{ heights: number[], overflows: boolean }} Measured
 *   each block's height at that scale, and whether any block runs wider than its column
 * @typedef {(scale: number, columns: number) => Promise<Measured>} MeasureAt
 *   draws the blocks at a scale, in that many columns, and measures them
 * @typedef {{ scale: number, columns: number }} TextLayout
 */

/**
 * How to lay the song out: the largest text that gets the whole song on
 * one page, in as few columns as will do. A long song goes into columns
 * when that makes the text larger than squeezing it into one. If it can't
 * fit one page at a readable size it takes as many pages as it needs, in
 * one column, as large as the page is wide. A scale the user picked is
 * used unless it would run wider than the page.
 * @param {MeasureAt} measureAt
 * @param {number} preferred a scale the user chose, or 0 to fit
 * @returns {Promise<TextLayout>}
 */
export async function chooseTextScale(measureAt, preferred) {
	const widest = async (/** @type {number} */ columns) =>
		(await largestThatFits(
			async (scale) => !(await measureAt(scale, columns)).overflows,
			SMALLEST_EVER,
			LARGEST
		)) ?? SMALLEST_EVER;

	const fitsOnePage = async (/** @type {number} */ scale, /** @type {number} */ columns) => {
		const { heights, overflows } = await measureAt(scale, columns);
		return !overflows && paginate(heights, CONTENT_HEIGHT).length <= columns;
	};

	/** @type {TextLayout | null} */
	let best = null;
	for (const columns of COLUMN_COUNTS) {
		if (preferred > 0) {
			const fits = preferred <= (await widest(columns)) && (await fitsOnePage(preferred, columns));
			if (fits) return { scale: preferred, columns };
			continue;
		}
		const scale = await largestThatFits(
			(scale) => fitsOnePage(scale, columns),
			SMALLEST_FOR_ONE_PAGE,
			LARGEST
		);
		if (scale !== null && (!best || scale > best.scale * WORTH_A_COLUMN)) best = { scale, columns };
	}
	if (best) return best;

	const wide = await widest(1);
	return {
		scale: preferred > 0 ? Math.min(preferred, wide) : Math.max(SMALLEST_FOR_ONE_PAGE, wide),
		columns: 1
	};
}

/**
 * Bisection, on a log scale (sizes feel proportional).
 * @param {(scale: number) => Promise<boolean>} fits assumed to fit up to some size and not beyond
 * @param {number} low
 * @param {number} high
 * @returns {Promise<number | null>} null if even `low` doesn't fit
 */
async function largestThatFits(fits, low, high) {
	if (!(await fits(low))) return null;
	if (await fits(high)) return high;
	for (let step = 0; step < SEARCH_STEPS; step++) {
		const middle = Math.sqrt(low * high);
		if (await fits(middle)) low = middle;
		else high = middle;
	}
	return low;
}
