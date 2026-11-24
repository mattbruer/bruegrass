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
 * @typedef {'earlier' | 'later' | 'higher' | 'lower' | 'shorter' | 'longer' | 'delete'} NoteStep
 * @typedef {{ midi: number } | { start: number } | { length: number } | 'delete'} NoteEdit
 */

/** @type {Record<string, NoteStep>} */
const KEY_STEPS = {
	ArrowUp: 'higher',
	ArrowDown: 'lower',
	ArrowLeft: 'earlier',
	ArrowRight: 'later',
	Delete: 'delete',
	Backspace: 'delete'
};

/**
 * What a key does to the picked note: arrows move it (Shift: an octave up
 * or down), Delete or Backspace removes it.
 * @param {string} key
 * @param {boolean} shiftKey
 * @param {NotePlace} note
 * @param {RollGrid} grid
 * @returns {NoteEdit | null}
 */
export function keyEdit(key, shiftKey, note, grid) {
	const step = KEY_STEPS[key];
	if (!step) return null;
	if (shiftKey && (step === 'higher' || step === 'lower'))
		return { midi: withinRange(note.midi + (step === 'higher' ? 12 : -12), grid.range) };
	return stepEdit(step, note, grid);
}

/**
 * The picked note moved one step: a grid step in time or length, a semitone in pitch.
 * @param {NoteStep} step
 * @param {NotePlace} note
 * @param {RollGrid} grid
 * @returns {NoteEdit}
 */
export function stepEdit(step, note, { gridStep, end, range }) {
	if (step === 'higher') return { midi: withinRange(note.midi + 1, range) };
	if (step === 'lower') return { midi: withinRange(note.midi - 1, range) };
	if (step === 'earlier') return { start: Math.max(0, note.start - gridStep) };
	if (step === 'later') return { start: Math.min(note.start + gridStep, end - note.length) };
	if (step === 'shorter') return { length: Math.max(gridStep, note.length - gridStep) };
	if (step === 'longer') return { length: Math.min(note.length + gridStep, end - note.start) };
	return 'delete';
}

/**
 * @param {number} midi
 * @param {PitchRange} range
 */
export function withinRange(midi, range) {
	return Math.min(range.highest, Math.max(range.lowest, midi));
}
