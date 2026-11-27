/**
 * Editing a stretch of a part at once (whole bars, picked on a Tracks lane):
 * copy it, clear it, paste or repeat it, take it out and pull the rest in,
 * or open a gap. Plain lists of notes in, a new list out, all in ticks
 * (melody/roll/ticks.js). The part's length never changes: it's the
 * chart's, so notes pushed past the end are lost (Undo brings them back).
 *
 * @typedef {import('../melody/roll/editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ notes: DrawnNote[], length: number }} Clip notes from 0, and how long the stretch is
 */

/**
 * The stretch's notes, from its start, cut off at its end.
 * @param {DrawnNote[]} notes
 * @param {number} from
 * @param {number} to
 * @returns {Clip}
 */
export function clipOf(notes, from, to) {
	const inside = notes
		.filter((note) => note.start >= from && note.start < to)
		.map((note) => ({
			...note,
			start: note.start - from,
			length: Math.min(note.length, to - note.start)
		}));
	return { notes: inside, length: to - from };
}

/**
 * The part with nothing in the stretch: its notes go, and a note ringing into it stops where it starts.
 * @param {DrawnNote[]} notes
 * @param {number} from
 * @param {number} to
 */
export function cleared(notes, from, to) {
	return notes
		.filter((note) => note.start < from || note.start >= to)
		.map((note) => (rings(note, from) ? { ...note, length: from - note.start } : note));
}

/**
 * The clip laid in at a place, over whatever was there.
 * @param {DrawnNote[]} notes
 * @param {Clip} clip
 * @param {number} at
 * @param {number} end the part's last tick
 */
export function pasted(notes, clip, at, end) {
	const to = Math.min(at + clip.length, end);
	const laid = clip.notes.map((note) => ({ ...note, start: note.start + at }));
	return sorted(fitted([...cleared(notes, at, to), ...laid], end));
}

/**
 * The stretch played again straight after itself (Logic's Repeat).
 * @param {DrawnNote[]} notes
 * @param {number} from
 * @param {number} to
 * @param {number} end
 */
export function repeated(notes, from, to, end) {
	return pasted(notes, clipOf(notes, from, to), to, end);
}

/**
 * The stretch taken out, and everything after it pulled in to close the gap.
 * @param {DrawnNote[]} notes
 * @param {number} from
 * @param {number} to
 */
export function removed(notes, from, to) {
	const gap = to - from;
	return sorted(
		cleared(notes, from, to).map((note) =>
			note.start >= to ? { ...note, start: note.start - gap } : note
		)
	);
}

/**
 * Empty time opened at a place, everything from there on pushed later.
 * @param {DrawnNote[]} notes
 * @param {number} at
 * @param {number} length
 * @param {number} end
 */
export function inserted(notes, at, length, end) {
	const moved = notes.map((note) => {
		if (note.start >= at) return { ...note, start: note.start + length };
		return rings(note, at) ? { ...note, length: at - note.start } : note;
	});
	return sorted(fitted(moved, end));
}

/**
 * @param {DrawnNote} note
 * @param {number} tick
 */
function rings(note, tick) {
	return note.start < tick && note.start + note.length > tick;
}

/**
 * Notes that start past the end go; one ringing past it stops there.
 * @param {DrawnNote[]} notes
 * @param {number} end
 */
function fitted(notes, end) {
	return notes
		.filter((note) => note.start < end)
		.map((note) => (note.start + note.length > end ? { ...note, length: end - note.start } : note));
}

/** @param {DrawnNote[]} notes */
function sorted(notes) {
	return notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
}
