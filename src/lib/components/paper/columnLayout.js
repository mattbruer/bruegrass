import { CONTENT_WIDTH, CONTENT_HEIGHT } from './paper.js';

export const COLUMN_GAP_PX = 0.3 * 96;
/** Spare room on a page is shared out between blocks, but no gap grows by more than this. */
const MOST_EXTRA_GAP_PX = 40;

/** @param {number} columns */
export function columnWidth(columns) {
	return (CONTENT_WIDTH - (columns - 1) * COLUMN_GAP_PX) / columns;
}

/**
 * Group a flow of columns into pages.
 * @param {number[][]} columnBlocks each column's block indexes, in reading order
 * @param {number} columnsPerPage
 * @returns {number[][][]} each page's columns
 */
export function pagesOfColumns(columnBlocks, columnsPerPage) {
	/** @type {number[][][]} */
	const pages = [];
	for (let c = 0; c < columnBlocks.length; c += columnsPerPage) {
		pages.push(columnBlocks.slice(c, c + columnsPerPage));
	}
	return pages;
}

/**
 * The extra space to put between blocks so the fullest column reaches the
 * foot of the page. The same for every column, so rows line up across them.
 * @param {number[][]} columnBlocks
 * @param {number[]} heights
 */
export function extraGap(columnBlocks, heights) {
	const fits = columnBlocks
		.filter((column) => column.length > 1)
		.map((column) => {
			const used = column.reduce((sum, index) => sum + (heights[index] ?? 0), 0);
			return (CONTENT_HEIGHT - used) / (column.length - 1);
		});
	if (fits.length === 0) return 0;
	return Math.max(0, Math.min(MOST_EXTRA_GAP_PX, ...fits));
}
