/**
 * Where the tune leaves room for the bass: a held note or a breath, the
 * spaces a bluegrass bassist fills. Read from when the lead's notes start,
 * so a long note and a note followed by a rest count alike.
 */
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';

const EPSILON = 1e-6;
/** A note longer than this (a half note) leaves the bass room to move. */
const HELD_QUARTERS = 2;

/**
 * When the lead's notes start, in quarters from the first of `sections`,
 * for one pass. The pickup also leads back into the top at the pass's end.
 * @param {import('../melody/melody.js').Melody | null} melody the whole song's tune
 * @param {{ quarters: number, offset?: number }} span quarters: the pass's
 *   length; offset: where it starts in the song (a loop region)
 * @returns {number[] | null} null without a tune
 */
export function leadOnsets(melody, { quarters, offset = 0 }) {
	if (!melody) return null;
	const lead = melody.notes.filter((note) => note.channel === MELODY_CHANNEL);
	const inPass = lead
		.map((note) => note.time - offset)
		.filter((time) => time >= -EPSILON && time < quarters - EPSILON);
	const pickup = lead.filter((note) => note.time < 0).map((note) => note.time + quarters);
	return [...inPass, ...pickup].sort((a, b) => a - b);
}

/**
 * The same, from a tune already prepared for playback (seconds, one pass).
 * @param {import('../melody/melody.js').MelodyPart | null} part
 * @param {number} bpm
 */
export function leadOnsetsOfPart(part, bpm) {
	if (!part) return null;
	return part.events
		.filter((event) => event.channel === MELODY_CHANNEL)
		.map((event) => event.time / (60 / bpm));
}

/**
 * Where the lead holds a note (or rests) for longer than HELD_QUARTERS: from
 * one note's start to the next one's, the last running to the pass's end.
 * @param {number[] | null} onsets sorted, from leadOnsets
 * @param {number} end the pass's length in quarters
 * @returns {{ start: number, end: number }[]}
 */
export function heldSpans(onsets, end) {
	if (!onsets) return [];
	return onsets
		.map((start, i) => ({ start, end: onsets[i + 1] ?? end }))
		.filter((span) => span.end - span.start >= HELD_QUARTERS + EPSILON);
}
