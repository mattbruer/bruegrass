/**
 * A tune with a pickup goes round: the pickup is also the last beats of
 * the last bar, leading back to bar 1. The roll shows it in both places and
 * either can be edited; it's still written once, in the pickup bar.
 *
 * The last bar's closing beats (the echo) belong to the pickup: a note drawn
 * there is a pickup note. Notes the last bar already had there stay its own
 * (marked `ownInEcho`), so nothing written before is moved.
 *
 * @typedef {import('./editNotes.js').DrawnNote & {
 *   echo?: boolean, fullLength?: number, shownLength?: number, ownInEcho?: boolean
 * }} RollNote
 *   echo: a pickup note shown in the last bar; fullLength: its real length when the
 *   song's end cut it short (shownLength)
 * @typedef {{ pickupEnd: number, from: number, to: number }} EchoZone ticks:
 *   the pickup is 0 to pickupEnd; its echo is from to to (the end of the last bar)
 */

/**
 * Where the pickup echoes, or null when the tune has none.
 * @param {import('./readScore.js').ScoreBar[]} bars
 * @param {(bar: import('./readScore.js').ScoreBar) => boolean} isPickup
 * @returns {EchoZone | null}
 */
export function echoZone(bars, isPickup) {
	const [first, last] = [bars[0], bars.at(-1)];
	if (bars.length < 2 || !first || !last || !isPickup(first)) return null;
	if (last.length < first.length) return null;
	const to = last.start + last.length;
	return { pickupEnd: first.start + first.length, from: to - first.length, to };
}

/**
 * The notes with the pickup shown again in the last bar.
 * @param {RollNote[]} notes the voice's own notes
 * @param {EchoZone | null} zone
 * @returns {RollNote[]}
 */
export function withPickupEcho(notes, zone) {
	if (!zone) return notes;
	const shift = zone.from;
	const own = notes.map((note) => (inEcho(note, zone) ? { ...note, ownInEcho: true } : note));
	const echoes = notes
		.filter((note) => note.start < zone.pickupEnd)
		.map((note) => {
			const start = note.start + shift;
			const length = Math.min(note.length, zone.to - start);
			return { ...note, start, length, echo: true, fullLength: note.length, shownLength: length };
		});
	return [...own, ...echoes].sort((a, b) => a.start - b.start || a.midi - b.midi);
}

/**
 * The voice's own notes from the roll's edited list: the pickup from
 * whichever copy was changed (the pickup bar or its echo).
 * @param {RollNote[]} edited
 * @param {RollNote[]} before the voice's own notes before the edit
 * @param {EchoZone | null} zone
 * @returns {import('./editNotes.js').DrawnNote[]}
 */
export function withoutPickupEcho(edited, before, zone) {
	if (!zone) return edited.map(plain);
	const isEchoNote = (/** @type {RollNote} */ note) => inEcho(note, zone) && !note.ownInEcho;
	const inPickup = edited.filter((note) => note.start < zone.pickupEnd);
	const fromEcho = edited.filter(isEchoNote).map((note) => ({
		...note,
		start: note.start - zone.from,
		length: note.fullLength && note.length === note.shownLength ? note.fullLength : note.length
	}));
	const pickupBefore = before.filter((note) => note.start < zone.pickupEnd);
	const pickup = sameNotes(inPickup, pickupBefore) ? fromEcho : inPickup;
	const rest = edited.filter((note) => note.start >= zone.pickupEnd && !isEchoNote(note));
	return [...pickup, ...rest].map(plain).sort((a, b) => a.start - b.start || a.midi - b.midi);
}

/**
 * Where a shown note really is: an echo is its pickup note, at the start.
 * @param {RollNote} note
 * @param {EchoZone | null} zone
 * @returns {import('./editNotes.js').DrawnNote}
 */
export function ownNote(note, zone) {
	return note.echo && zone ? { ...plain(note), start: note.start - zone.from } : plain(note);
}

/**
 * @param {RollNote} note
 * @param {EchoZone} zone
 */
function inEcho(note, zone) {
	return note.start >= zone.from && note.start < zone.to;
}

/**
 * @param {RollNote[]} a
 * @param {RollNote[]} b
 */
function sameNotes(a, b) {
	const key = (/** @type {RollNote} */ note) => `${note.start}:${note.midi}:${note.length}`;
	const keys = (/** @type {RollNote[]} */ list) => list.map(key).sort().join(' ');
	return keys(a) === keys(b);
}

/** @param {RollNote} note */
function plain({ midi, start, length }) {
	return { midi, start, length };
}
