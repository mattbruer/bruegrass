/**
 * A held note split where the chart changes chord in the middle of it, and
 * tied, so it sounds the same (`"C"c4` → `"C"c2-c2`) and the change has a
 * note to be written on. A rest is split without a tie. A note whose
 * written length isn't what it plays (in a tuplet, with broken rhythm `>`),
 * or written in a way this doesn't read, stays whole.
 */
import { slotPositions } from '../chart/timeline.js';
import { isNoChord } from '../chart/noChord.js';
import { walk } from './abcChords.js';

const EPSILON = 1e-6;
/** The finest length a part may come out as, in the tune's unit length (1/64). */
const FINEST = 64;

/**
 * One note or rest as written: what goes before it (chord symbols,
 * decorations, grace notes, a slur), its pitch, length, tie, and what follows.
 */
const NOTE =
	/^((?:"[^"]*"|![^!]*!|[.~HLMOPSTuv]|\{[^}]*\}|\((?!\d)|\s)*)([_^=]*[A-Ga-g][,']*|[zx]|\[[^\]]+\])(\d*(?:\/+\d*)?)(-?)(\)*\s*)$/;

/**
 * @typedef {{ startChar: number, endChar: number, length: number, rest: boolean, parts: string[], unit: number }} WrittenNote
 *   parts: NOTE's groups; unit: how long one unit length of it plays, in quarters
 */

/**
 * @param {string} abc the tune
 * @param {any[][]} voices abcjs.synth.sequence(tune) for that ABC
 * @param {import('../chart/timeline.js').Section[]} sections the chart
 * @returns {string}
 */
export function tuneSplitAtChanges(abc, voices, sections) {
	const changes = chordChangeTimes(sections);
	const { items, pickup } = walk(voices[0] ?? []);
	const notes = writtenNotes(abc, items);
	const unit = usualUnit(notes);
	/** @type {Map<number, { note: WrittenNote, cuts: number[] }>} */
	const splits = new Map();
	for (const item of items) {
		const note = notes.get(/** @type {number} */ (item.startChar));
		if (!note || Math.abs(note.unit - unit) > EPSILON) continue;
		if (splits.has(note.startChar)) continue; // a repeated bar: as on its first pass
		const start = item.t - pickup;
		const cuts = changes
			.filter((time) => time > start + EPSILON && time < start + note.length - EPSILON)
			.map((time) => time - start);
		if (cuts.length > 0) splits.set(note.startChar, { note, cuts });
	}

	let result = abc;
	for (const [startChar, { note, cuts }] of [...splits].sort((a, b) => b[0] - a[0])) {
		const split = splitNote(note, cuts);
		if (split) result = result.slice(0, startChar) + split + result.slice(note.endChar);
	}
	return result;
}

/**
 * The notes and rests written in a way this reads, by where they start.
 * @param {string} abc
 * @param {import('./abcChords.js').Item[]} items
 * @returns {Map<number, WrittenNote>}
 */
function writtenNotes(abc, items) {
	/** @type {Map<number, WrittenNote>} */
	const notes = new Map();
	for (const { startChar, endChar, length, rest } of items) {
		if (startChar === undefined || endChar === undefined || notes.has(startChar)) continue;
		const match = abc.slice(startChar, endChar).match(NOTE);
		if (!match) continue;
		const parts = match.slice(1);
		notes.set(startChar, {
			startChar,
			endChar,
			length,
			rest,
			parts,
			unit: length / lengthOf(parts[2])
		});
	}
	return notes;
}

/**
 * The unit length most of the tune's notes play at (its L:); a tuplet's
 * or broken rhythm's notes play at another.
 * @param {Map<number, WrittenNote>} notes
 */
function usualUnit(notes) {
	/** @type {Map<string, { unit: number, count: number }>} */
	const counts = new Map();
	for (const { unit } of notes.values()) {
		const key = unit.toFixed(6);
		counts.set(key, { unit, count: (counts.get(key)?.count ?? 0) + 1 });
	}
	return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.unit ?? 0;
}

/**
 * When the chart's chord changes, in quarters from bar 1 (N.C. left out: it
 * has no symbol to show).
 * @param {import('../chart/timeline.js').Section[]} sections
 */
function chordChangeTimes(sections) {
	const slots = slotPositions(sections);
	return slots
		.filter((slot, k) => k > 0 && slots[k - 1].name !== slot.name && !isNoChord(slot.name))
		.map((slot) => slot.start);
}

/**
 * A note's text split into tied parts at the given points (`"C"c4 ` → `"C"c2-c2 `).
 * @param {WrittenNote} note
 * @param {number[]} cuts where to split it, in quarters from its start
 * @returns {string | null} null when a part would be finer than FINEST
 */
function splitNote({ parts: [before, pitch, , tie, after], length, rest, unit }, cuts) {
	const points = [0, ...cuts, length];
	const lengths = points.slice(1).map((end, i) => durationText((end - points[i]) / unit));
	if (lengths.includes(null)) return null;
	const joint = rest ? ' ' : '-';
	return before + lengths.map((part) => pitch + part).join(joint) + tie + after;
}

/**
 * How many of the tune's unit lengths an ABC length is: "" 1, "3" 3, "3/2" 1.5, "/2" and "/" 0.5, "//" 0.25.
 * @param {string} text
 */
function lengthOf(text) {
	const [, number, slashes, under] = text.match(/^(\d*)(\/*)(\d*)$/) ?? [];
	const top = number ? Number(number) : 1;
	if (!slashes) return top;
	if (under) return top / Number(under);
	return top / 2 ** slashes.length;
}

/**
 * An ABC length for a number of unit lengths: 1 "", 2 "2", 1.5 "3/2", 0.5 "/2".
 * @param {number} units
 * @returns {string | null} null when it's finer than FINEST
 */
function durationText(units) {
	const sixtyFourths = Math.round(units * FINEST);
	if (sixtyFourths <= 0 || Math.abs(sixtyFourths - units * FINEST) > EPSILON * FINEST) return null;
	let top = sixtyFourths;
	let under = FINEST;
	while (top % 2 === 0 && under > 1) {
		top /= 2;
		under /= 2;
	}
	if (under === 1) return top === 1 ? '' : String(top);
	return top === 1 ? `/${under}` : `${top}/${under}`;
}
