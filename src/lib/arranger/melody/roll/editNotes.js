/**
 * Editing the drawn melody. Notes that start together are a stack (a
 * double stop, a chord) and share one length: a note added to a stack
 * takes its length, and resizing any note of it resizes them all. Otherwise one thing sounds at a time: a note drawn over
 * others replaces what it covers, and shortens a note that rings into it.
 * Every helper returns a new list, sorted by start, then low to high.
 *
 * @typedef {{ midi: number, start: number, length: number }} DrawnNote
 *   midi: written (concert) pitch; start and length in ticks from the
 *   start of the first written bar (ticks.js)
 */

/**
 * @param {DrawnNote[]} notes
 * @param {DrawnNote} note
 * @param {number} end the last tick of the tune: notes stop there
 * @param {{ resizesStack?: boolean }} [options] resizesStack: the note's
 *   length is the stack's new length (otherwise it joins at the stack's)
 */
export function addNote(notes, note, end, { resizesStack = false } = {}) {
	const stack = notes.find((other) => other.start === note.start && other.midi !== note.midi);
	const wanted = stack && !resizesStack ? stack.length : note.length;
	const length = Math.min(wanted, end - note.start);
	if (length <= 0 || note.start < 0) return notes;
	const added = { ...note, length };
	const stop = added.start + added.length;
	const kept = notes
		.filter((other) => !covers(added, stop, other))
		.map((other) => {
			if (other.start === added.start) return { ...other, length };
			if (other.start < added.start && other.start + other.length > added.start)
				return { ...other, length: added.start - other.start };
			return other;
		});
	return sorted([...kept, added]);
}

/**
 * Does the added note take this one's place? It does when it starts inside
 * it, or is the same pitch at the same time; a note starting with it
 * joins its stack instead.
 * @param {DrawnNote} added
 * @param {number} stop
 * @param {DrawnNote} other
 */
function covers(added, stop, other) {
	if (other.start === added.start) return other.midi === added.midi;
	return other.start > added.start && other.start < stop;
}

/**
 * @param {DrawnNote[]} notes
 * @param {number} index
 */
export function deleteNote(notes, index) {
	return notes.filter((_, i) => i !== index);
}

/**
 * Put the note at `index` somewhere else, or make it longer or shorter.
 * @param {DrawnNote[]} notes
 * @param {number} index
 * @param {Partial<DrawnNote>} change
 * @param {number} end
 */
export function changeNote(notes, index, change, end) {
	const before = notes[index];
	const after = { ...before, ...change };
	const resizesStack =
		after.start === before.start && after.midi === before.midi && after.length !== before.length;
	return addNote(deleteNote(notes, index), after, end, { resizesStack });
}

/**
 * The note sounding at this tick and pitch, if any.
 * @param {DrawnNote[]} notes
 * @param {number} tick
 * @param {number} midi
 */
export function noteAt(notes, tick, midi) {
	return notes.findIndex(
		(note) => note.midi === midi && note.start <= tick && tick < note.start + note.length
	);
}

/** @param {DrawnNote[]} notes */
function sorted(notes) {
	return notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
}
