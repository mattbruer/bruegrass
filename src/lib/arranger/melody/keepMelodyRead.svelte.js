/**
 * Keeps the melody state read from its notation: draws the ABC (after a
 * pause in typing) and hands what abcjs found to `melody.drawn`. abcjs
 * reads a tune by drawing it, so a page without sheet music still draws
 * it somewhere hidden (MelodyReader.svelte), or the band would play
 * without the melody.
 *
 * Call it while a component is being set up; the effect ends with it.
 */
import { drawSheetMusic } from './drawSheetMusic.js';

/** Redraw this long after the last keystroke, not on every one. */
const REDRAW_DELAY_MS = 200;

/**
 * @param {import('../state/MelodyState.svelte.js').MelodyState} melody
 * @param {() => HTMLElement | undefined} target where to draw (read when it changes)
 * @param {() => number} transpose semitones to draw it moved by (display only)
 * @param {() => number} [width] the page's width, so the lines reflow when it changes
 */
export function keepMelodyRead(melody, target, transpose, width = () => 0) {
	$effect(() => {
		const notation = melody.notation;
		const shift = transpose();
		const element = target();
		width();
		if (!melody.hasNotation) {
			melody.clearDrawing();
			return;
		}
		if (!element) return;

		let replaced = false;
		const timer = setTimeout(async () => {
			const drawn = await drawSheetMusic(element, notation, { transpose: shift });
			if (!replaced) melody.drawn = drawn;
		}, REDRAW_DELAY_MS);

		return () => {
			replaced = true; // newer typing wins
			clearTimeout(timer);
		};
	});
}
