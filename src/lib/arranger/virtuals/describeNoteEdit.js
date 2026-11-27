/**
 * What a piano-roll edit did, in a few words, and where: so Undo can say
 * what it takes back ("Undo: Move a note") and show the place.
 *
 * @typedef {import('../melody/roll/editNotes.js').DrawnNote} DrawnNote
 */

/**
 * @param {DrawnNote[]} before
 * @param {DrawnNote[]} after
 * @returns {{ label: string, from: number, to: number } | null} from, to: the ticks that changed (null: nothing did)
 */
export function describeNoteEdit(before, after) {
	const gone = before.filter((note) => !after.some((other) => same(note, other)));
	const added = after.filter((note) => !before.some((other) => same(note, other)));
	const changed = [...gone, ...added];
	if (changed.length === 0) return null;
	return {
		label: labelOf(gone.length, added.length),
		from: Math.min(...changed.map((note) => note.start)),
		to: Math.max(...changed.map((note) => note.start + note.length))
	};
}

/**
 * @param {number} gone
 * @param {number} added
 */
function labelOf(gone, added) {
	if (gone === 0) return added === 1 ? 'Add a note' : `Add ${added} notes`;
	if (added === 0) return gone === 1 ? 'Delete a note' : `Delete ${gone} notes`;
	if (gone === 1 && added === 1) return 'Change a note';
	return 'Change notes';
}

/**
 * @param {DrawnNote} a
 * @param {DrawnNote} b
 */
function same(a, b) {
	return a.start === b.start && a.midi === b.midi && a.length === b.length;
}
