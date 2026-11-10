/**
 * Fills under held tune notes: while the lead holds (bass/melodySpace.js),
 * the bass walks in quarter notes into its next note, "1 2 3 │ 4" style,
 * the way a bluegrass bassist fills the singer's space. Only adds motion:
 * the downbeat stays, and a bar that already walks is left alone.
 */

/** Above this, a repeated note is approached from below instead (bassline.js numbering). */
const HIGH_APPROACH = 50;

/**
 * @typedef {import('./bassline.js').RawNote} RawNote
 * @typedef {{ start: number, end: number }} Span in quarters
 */

/**
 * @param {RawNote[]} notes the line so far, sorted
 * @param {{ held: Span[], bars: Span[], inScale: (pitch: number) => boolean }} context
 * @returns {RawNote[]}
 */
export function fillUnderHeldNotes(notes, { held, bars, inScale }) {
	let line = notes;
	for (const bar of bars) {
		for (const span of held) {
			const window = fillWindow(line, span, bar);
			if (window) line = walkInto(line, window, inScale);
		}
	}
	return line;
}

/**
 * The quarters a fill takes in this bar: from the first beat after the held
 * note starts (never the downbeat) to the bass's next note, within the bar.
 * @param {RawNote[]} notes
 * @param {Span} span
 * @param {Span} bar
 * @returns {Span | null}
 */
function fillWindow(notes, span, bar) {
	const start = Math.max(Math.floor(span.start) + 1, bar.start + 1);
	const heldUntil = Math.min(span.end, bar.end);
	if (start >= heldUntil) return null;

	const inside = notes.filter((note) => note.beat >= start && note.beat < heldUntil);
	if (inside.some((note) => note.role === 'walk')) return null;
	const next = notes.find((note) => note.beat >= heldUntil);
	const end = Math.min(next ? next.beat : bar.end, bar.end);
	if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
	return { start, end };
}

/**
 * Replace the bass's notes in the window with quarter notes stepping from
 * the note before it into the note after it.
 * @param {RawNote[]} notes
 * @param {Span} window
 * @param {(pitch: number) => boolean} inScale
 */
function walkInto(notes, { start, end }, inScale) {
	const before = notes.filter((note) => note.beat < start);
	const after = notes.filter((note) => note.beat >= end);
	const from = before.at(-1);
	if (!from) return notes;
	const to = after[0]?.pitch ?? from.pitch;

	const pitches = approachLine(from.pitch, to, end - start, inScale);
	const trimmed = before.map((note) =>
		note.beat + note.length > start ? { ...note, length: start - note.beat } : note
	);
	const fill = pitches.map((pitch, i) => ({
		beat: start + i,
		length: 1,
		pitch,
		role: /** @type {const} */ ('walk')
	}));
	return [...trimmed, ...fill, ...after];
}

/**
 * `count` scale notes stepping into `to` from the side `from` is on
 * (from above when they're the same note, unless that's high for a bass):
 * G→D down in two is F# E, D→C in two is E D.
 * @param {number} from
 * @param {number} to
 * @param {number} count
 * @param {(pitch: number) => boolean} inScale
 */
function approachLine(from, to, count, inScale) {
	const side = from === to ? (to < HIGH_APPROACH ? 1 : -1) : Math.sign(from - to);
	const line = [];
	for (let p = to + side; line.length < count; p += side) if (inScale(p)) line.unshift(p);
	return line;
}
