/**
 * Which melody notes under a chord decide what the chord can be. The
 * Berklee text (pp. 11–14, 106; docs/theory/chord-scales.md) splits a
 * melody into target notes, heard as the chord, and approach notes, short
 * notes that step into a target. Only targets have to fit the chord.
 *
 * A note is a target when it sounds as the chord changes, lands on one of
 * the bass's beats (the boom of the boom-chick), lasts longer than a beat,
 * or is followed by a leap or a rest. Any other note that moves by step to
 * the next one is an approach note.
 */

/** Longer than this (quarter notes) is a long note: always a target. */
const LONG_NOTE = 1;
/** Up to a whole step: further is a leap. */
const STEP = 2;
const EPSILON = 1e-6;

/**
 * @typedef {{ time: number, length: number, pitch: number }} Note time and length in quarter notes
 * @typedef {Note & { target: boolean, onBoom: boolean }} ReadNote
 */

/**
 * @param {Note[]} notes the melody, in time order
 * @param {{ start: number, length: number }} span the chord's time
 * @param {number[]} booms when the bass plays (quarter notes)
 * @returns {ReadNote[]} the notes sounding under the chord
 */
export function melodyTargets(notes, span, booms) {
	const end = span.start + span.length;
	const under = notes.filter(
		(note) => note.time < end - EPSILON && note.time + note.length > span.start + EPSILON
	);
	return under.map((note) => {
		const onBoom = booms.some((boom) => Math.abs(boom - note.time) < EPSILON);
		return { ...note, onBoom, target: isTarget(note, notes, span, onBoom) };
	});
}

/**
 * @param {Note} note
 * @param {Note[]} notes
 * @param {{ start: number }} span
 * @param {boolean} onBoom
 */
function isTarget(note, notes, span, onBoom) {
	if (note.time <= span.start + EPSILON) return true; // sounding as the chord changes
	if (onBoom || note.length > LONG_NOTE + EPSILON) return true;
	const next = notes.find((other) => other.time > note.time + EPSILON);
	if (!next || next.time > note.time + note.length + EPSILON) return true; // a rest follows
	return Math.abs(next.pitch - note.pitch) > STEP || next.pitch === note.pitch;
}
