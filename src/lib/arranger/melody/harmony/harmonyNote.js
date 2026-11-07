/**
 * Where a harmony part sings against one melody note.
 *
 * Bluegrass harmony stacks on the chord the band plays. On a chord tone, a
 * part counts chord tones from the melody (the tenor over the 5th sings the
 * root above, a fourth up). On a note outside the chord (a passing note),
 * the parts sing a close triad built on the melody note from the chord's
 * scale, so they move in parallel with the tune.
 */
import { chordScale } from '../../theory/chordScales.js';
import { semitones } from '../../theory/musicInKey.js';

/* Parts count root, third and fifth: a 7th chord's seventh is treated as a passing note. */
const TRIAD = 3;

/**
 * @typedef {import('../../theory/musicInKey.js').Note} Note
 * @typedef {import('../../theory/musicInKey.js').Chord} Chord
 */

/**
 * @param {Note} lead the melody note, as a step of the key
 * @param {Chord} chord what the band plays under it
 * @param {number} chordTones how far the part sings: 1 = next chord tone up, -1 = next down
 * @returns {Note}
 */
export function harmonyNote(lead, chord, chordTones) {
	const { tones, scale } = chordScale(chord);
	const triad = tones.slice(0, TRIAD);
	const stack = isAmong(lead, triad) ? triad : triadOn(lead, scale);
	return countAlong(lead, stack, chordTones);
}

/**
 * @param {Note} note
 * @param {Note[]} notes
 */
function isAmong(note, notes) {
	return notes.some(
		(other) =>
			mod(other.step - note.step, 7) === 0 && mod(semitones(other) - semitones(note), 12) === 0
	);
}

/**
 * The note with a third and a fifth of the scale stacked on it.
 * @param {Note} note
 * @param {Note[]} scale
 */
function triadOn(note, scale) {
	return [note, scaleNoteOn(scale, note.step + 2), scaleNoteOn(scale, note.step + 4)];
}

/**
 * The scale's note with this letter, at this step.
 * @param {Note[]} scale
 * @param {number} step
 */
function scaleNoteOn(scale, step) {
	const note = scale.find((n) => mod(n.step - step, 7) === 0);
	return { step, alt: note?.alt ?? 0 };
}

/**
 * Count `count` notes of the stack up (or down) from the lead.
 * @param {Note} lead one of the stack's notes, in any octave
 * @param {Note[]} stack notes with different letters
 * @param {number} count
 */
function countAlong(lead, stack, count) {
	const ladder = [-2, -1, 0, 1, 2]
		.flatMap((octave) =>
			stack.map((note) => ({
				step: lead.step + mod(note.step - lead.step, 7) + 7 * octave,
				alt: note.alt
			}))
		)
		.sort((a, b) => a.step - b.step);
	const at = ladder.findIndex((note) => note.step === lead.step);
	return ladder[at + count];
}

/** @param {number} n @param {number} m */
const mod = (n, m) => ((n % m) + m) % m;
