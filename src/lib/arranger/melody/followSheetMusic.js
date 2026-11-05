/**
 * While playing, show where the band is in the sheet music: the sounding
 * note is lit in the accent colour, and a thin cursor glides across the
 * staff (so you can see the beat move through a long held note).
 *
 * Time always comes from the band's audio clock (see follow.js), so the
 * cursor can't drift from what you hear.
 */
import { eventAt } from './follow.js';

const CURSOR_WIDTH = 2; // in the sheet music's SVG units
/* Classes the page's styles colour (see SheetMusic.svelte) */
const PLAYING_NOTE_CLASS = 'abcjs-playing';
const CURSOR_CLASS = 'abcjs-cursor';

/**
 * Start following. Returns a function that stops following and tidies up.
 * @param {{
 *   svg: SVGSVGElement,
 *   notes: import('./follow.js').SheetEvent[],
 *   melodyTimeNow: () => number,
 *   onNewLine: (cursor: Element) => void
 * }} options
 *   melodyTimeNow: where the melody is right now, in quarter notes from bar 1
 *     (NaN when stopped); onNewLine: called when the cursor moves to another
 *     line of music
 */
export function followSheetMusic({ svg, notes, melodyTimeNow, onNewLine }) {
	const cursor = createCursor(svg);
	const highlight = createHighlighter(notes);
	let currentLine = -1;

	let frame = requestAnimationFrame(function everyFrame() {
		const time = melodyTimeNow();
		const index = Number.isFinite(time) ? eventAt(notes, time) : -1;
		highlight(index);

		if (index < 0) {
			cursor.style.display = 'none';
		} else {
			const note = notes[index];
			placeCursor(cursor, note, time);
			if (note.line !== currentLine) {
				currentLine = note.line;
				onNewLine(cursor);
			}
		}
		frame = requestAnimationFrame(everyFrame);
	});

	return function stopFollowing() {
		cancelAnimationFrame(frame);
		highlight(-1);
		cursor.remove();
	};
}

/** @param {SVGSVGElement} svg */
function createCursor(svg) {
	const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	cursor.setAttribute('class', CURSOR_CLASS);
	cursor.setAttribute('width', String(CURSOR_WIDTH));
	cursor.style.display = 'none';
	svg.appendChild(cursor);
	return cursor;
}

/**
 * Glide across the note: from its left edge at its start towards the next
 * note by its end.
 * @param {SVGRectElement} cursor
 * @param {import('./follow.js').SheetEvent} note
 * @param {number} time
 */
function placeCursor(cursor, note, time) {
	const progress = Math.min(1, Math.max(0, (time - note.t) / (note.end - note.t)));
	cursor.setAttribute('x', String(note.left + (note.endX - note.left) * progress));
	cursor.setAttribute('y', String(note.top));
	cursor.setAttribute('height', String(note.height));
	cursor.style.display = '';
}

/**
 * Returns highlight(index): lights note `index` (or none, for -1), touching
 * the page only when the note changes.
 * @param {import('./follow.js').SheetEvent[]} notes
 */
function createHighlighter(notes) {
	let litIndex = -1;

	return function highlight(/** @type {number} */ index) {
		if (index === litIndex) return;
		for (const element of notes[litIndex]?.elements ?? [])
			element.classList.remove(PLAYING_NOTE_CLASS);
		for (const element of notes[index]?.elements ?? []) element.classList.add(PLAYING_NOTE_CLASS);
		litIndex = index;
	};
}
