/**
 * Where the piano roll scrolls to, as plain maths: following the band
 * while it plays, and showing the tune when the roll opens.
 */

/** While following, the playhead sits this far across the view. */
const FOLLOW_AT = 1 / 3;

/**
 * @typedef {{ start: number, midi: number, length: number }} NotePlace
 * @typedef {{ width: number, height: number, top: number }} View
 *   width/height: the notes' visible area in pixels; top: how far it's scrolled down
 */

/**
 * The scroll that keeps the playhead a third of the way across and the
 * sounding note in view (top: null, leave it where it is).
 * @param {number} tick where the band is
 * @param {NotePlace[]} notes
 * @param {View} view
 * @param {{ tickWidth: number, rowHeight: number, highest: number }} size
 */
export function followScroll(tick, notes, view, { tickWidth, rowHeight, highest }) {
	const left = Math.max(0, tick * tickWidth - view.width * FOLLOW_AT);
	const sounding = notes.find((note) => note.start <= tick && tick < note.start + note.length);
	if (!sounding) return { left, top: null };
	const y = (highest - sounding.midi) * rowHeight;
	const inView = y >= view.top && y + rowHeight <= view.top + view.height;
	return { left, top: inView ? null : Math.max(0, y - view.height / 2) };
}

/**
 * The pitch to centre on when the roll opens: the middle of the tune, or
 * the home note near middle C when there are no notes yet.
 * @param {NotePlace[]} notes
 * @param {number} tonic pitch class of the key's home note
 */
export function middlePitch(notes, tonic) {
	if (notes.length === 0) return 60 + ((tonic + 7) % 12);
	const pitches = notes.map((note) => note.midi);
	return (Math.min(...pitches) + Math.max(...pitches)) / 2;
}
