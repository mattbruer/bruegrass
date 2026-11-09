/**
 * Editing the drawn melody: one note at a time, like a singer. Every
 * helper returns a new list, sorted by start; a note drawn over others
 * replaces what it covers, and shortens a note that rings into it.
 *
 * @typedef {{ midi: number, start: number, length: number }} DrawnNote
 *   midi: written (concert) pitch; start and length in ticks from the
 *   start of the first written bar (ticks.js)
 */

/**
 * @param {DrawnNote[]} notes
 * @param {DrawnNote} note
 * @param {number} end the last tick of the tune: notes stop there
 */
export function addNote(notes, note, end) {
	const length = Math.min(note.length, end - note.start);
	if (length <= 0 || note.start < 0) return notes;
	const added = { ...note, length };
	const stop = added.start + added.length;
	const kept = notes
		.filter((other) => other.start < added.start || other.start >= stop)
		.map((other) =>
			other.start < added.start && other.start + other.length > added.start
				? { ...other, length: added.start - other.start }
				: other
		);
	return sorted([...kept, added]);
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
	return addNote(deleteNote(notes, index), { ...notes[index], ...change }, end);
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
	return notes.sort((a, b) => a.start - b.start);
}
