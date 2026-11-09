/**
 * The sheet of paper charts are laid out on: US Letter, in CSS pixels
 * (96 to the inch). For A4, change it here and the `@page` size in
 * PaperPages.svelte.
 */
const INCH = 96;

export const PAPER = Object.freeze({
	width: 8.5 * INCH,
	height: 11 * INCH,
	margin: 0.4 * INCH
});

export const CONTENT_WIDTH = PAPER.width - 2 * PAPER.margin;
export const CONTENT_HEIGHT = PAPER.height - 2 * PAPER.margin;
