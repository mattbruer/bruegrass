/**
 * What the piano roll's gestures do to a note, as plain maths: no events,
 * no DOM. The roll measures the pointer and asks here where the note goes.
 */
import { snapNearest } from './ticks.js';

/** Pixels of a note's right end that resize it rather than move it. */
const EDGE_MIN = 10;
const EDGE_MAX = 24;

/**
 * @typedef {{ start: number, midi: number, length: number }} NotePlace
 * @typedef {{ highest: number, lowest: number }} PitchRange
 * @typedef {{ tickWidth: number, rowHeight: number, gridStep: number, end: number, range: PitchRange }} RollGrid
 */

/**
 * How much of a note's right end (pixels) resizes it.
 * @param {NotePlace} note
 * @param {number} tickWidth
 */
export function resizeEdge(note, tickWidth) {
	return Math.min(EDGE_MAX, Math.max(EDGE_MIN, note.length * tickWidth * 0.35));
}

/**
 * Pressing a note near its right end resizes it; anywhere else moves it.
 * @param {NotePlace} note
 * @param {number} x where it was pressed, in pixels from the roll's left
 * @param {number} tickWidth
 * @returns {'move' | 'resize'}
 */
export function grabbedPart(note, x, tickWidth) {
	return x > (note.start + note.length) * tickWidth - resizeEdge(note, tickWidth)
		? 'resize'
		: 'move';
}

/**
 * A note being drawn reaches to the grid line nearest the pointer (at least one step).
 * @param {number} start
 * @param {number} tick where the pointer is now
 * @param {number} gridStep
 */
export function drawnLength(start, tick, gridStep) {
	return Math.max(gridStep, snapNearest(tick, gridStep) - start);
}

/**
 * A note dragged by (dx, dy) pixels: snapped to the grid, kept on the roll.
 * @param {NotePlace} grabbed where it was when pressed
 * @param {number} dx
 * @param {number} dy
 * @param {RollGrid} grid
 * @returns {NotePlace}
 */
export function movedNote(grabbed, dx, dy, { tickWidth, rowHeight, gridStep, end, range }) {
	const shift = snapNearest(dx / tickWidth, gridStep);
	const start = Math.min(Math.max(0, grabbed.start + shift), end - grabbed.length);
	const midi = withinRange(grabbed.midi - Math.round(dy / rowHeight), range);
	return { ...grabbed, start, midi };
}

/**
 * A note whose right end is dragged by dx pixels.
 * @param {NotePlace} grabbed
 * @param {number} dx
 * @param {RollGrid} grid
 * @returns {NotePlace}
 */
export function resizedNote(grabbed, dx, { tickWidth, gridStep }) {
	const length = Math.max(gridStep, snapNearest(grabbed.length + dx / tickWidth, gridStep));
	return { ...grabbed, length };
}

/**
 * What a key does to the picked note: arrows move it (Shift: an octave up
 * or down), Delete or Backspace removes it.
 * @param {string} key
 * @param {boolean} shiftKey
 * @param {NotePlace} note
 * @param {RollGrid} grid
 * @returns {{ midi: number } | { start: number } | 'delete' | null}
 */
export function keyEdit(key, shiftKey, note, { gridStep, end, range }) {
	if (key === 'Delete' || key === 'Backspace') return 'delete';
	if (key === 'ArrowUp' || key === 'ArrowDown') {
		const step = (key === 'ArrowUp' ? 1 : -1) * (shiftKey ? 12 : 1);
		return { midi: withinRange(note.midi + step, range) };
	}
	if (key === 'ArrowLeft' || key === 'ArrowRight') {
		const shift = key === 'ArrowLeft' ? -gridStep : gridStep;
		return { start: Math.min(Math.max(0, note.start + shift), end - note.length) };
	}
	return null;
}

/**
 * @param {number} midi
 * @param {PitchRange} range
 */
export function withinRange(midi, range) {
	return Math.min(range.highest, Math.max(range.lowest, midi));
}
