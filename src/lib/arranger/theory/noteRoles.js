/**
 * What each melody note is doing against the band's chords: the Berklee
 * text's target and approach notes (pp. 11–14, 106; docs/theory/chord-scales.md),
 * plus anticipations and suspensions. Plain data in and out, so the harmony
 * parts, the chord suggestions and (later) the guitar's and mandolin's
 * voicings can all read the melody the same way.
 *
 * - target: heard as the chord. It sounds as the chord changes, lands on one
 *   of the bass's beats, lasts longer than a beat, or is followed by a leap or a rest.
 * - approach: any other note that steps into the next one.
 * - anticipation: a note of the next chord arriving early, just before the
 *   change (tied across it, or repeated on it).
 * - suspension / retardation: a note of the previous chord held or repeated
 *   over the new one, then stepping down (suspension) or up (retardation)
 *   into one of the new chord's notes.
 */

/** Longer than this (quarter notes) is a long note: always a target. */
const LONG_NOTE = 1;
/** Up to a whole step: further is a leap. */
const STEP = 2;
/** An anticipation arrives at most this early (quarter notes). */
const EARLIEST_ANTICIPATION = 1;
const EPSILON = 1e-6;

/**
 * @typedef {{ time: number, length: number, pitch: number }} Note time and length in quarter notes, pitch MIDI
 * @typedef {'target' | 'approach' | 'anticipation' | 'suspension' | 'retardation'} Role
 * @typedef {Note & { role: Role, onBoom: boolean, chordTime: number, resolvesTo: number | null }} RoledNote
 *   chordTime: when the chord it belongs to is sounding (the next chord's for
 *   an anticipation, the previous chord's for a suspension, its own otherwise);
 *   resolvesTo: the note a suspension or retardation steps to
 * @typedef {{
 *   isBoom: (time: number) => boolean,
 *   changes: number[],
 *   tonesAt: (time: number) => number[]
 * }} Band
 *   isBoom: whether the bass plays then; changes: when the chord changes;
 *   tonesAt: the pitch classes of the chord sounding then (none: no chord)
 */

/**
 * @param {Note[]} notes the melody, in time order
 * @param {Band} band
 * @returns {RoledNote[]}
 */
export function noteRoles(notes, band) {
	return notes.map((note, i) => {
		const next = notes[i + 1] ?? null;
		const onBoom = band.isBoom(note.time);
		return { ...note, onBoom, ...roleOf(note, next, onBoom, band) };
	});
}

/**
 * @param {Note} note
 * @param {Note | null} next
 * @param {boolean} onBoom
 * @param {Band} band
 * @returns {{ role: Role, chordTime: number, resolvesTo: number | null }}
 */
function roleOf(note, next, onBoom, band) {
	const pc = mod12(note.pitch);
	const changeAhead = band.changes.find(
		(change) =>
			change > note.time + EPSILON &&
			change - note.time <= EARLIEST_ANTICIPATION + EPSILON &&
			change <= note.time + note.length + EPSILON
	);
	if (changeAhead !== undefined && !onBoom && isAnticipation(note, next, changeAhead, band)) {
		return { role: 'anticipation', chordTime: changeAhead, resolvesTo: null };
	}

	const changeHere = band.changes.find(
		(change) => change >= note.time - EPSILON && change < note.time + note.length - EPSILON
	);
	if (changeHere !== undefined && next) {
		const before = band.tonesAt(changeHere - EPSILON);
		const after = band.tonesAt(changeHere);
		const resolves = Math.abs(next.pitch - note.pitch) <= STEP && next.pitch !== note.pitch;
		if (resolves && before.includes(pc) && !after.includes(pc)) {
			if (after.includes(mod12(next.pitch))) {
				const role = next.pitch < note.pitch ? 'suspension' : 'retardation';
				return { role, chordTime: changeHere - EPSILON, resolvesTo: next.pitch };
			}
		}
	}

	const target = changeHere !== undefined || isTarget(note, next, onBoom);
	return { role: target ? 'target' : 'approach', chordTime: note.time, resolvesTo: null };
}

/**
 * A note of the next chord, not of this one, that reaches it early: held
 * across the change or sounded again right on it.
 * @param {Note} note
 * @param {Note | null} next
 * @param {number} change
 * @param {Band} band
 */
function isAnticipation(note, next, change, band) {
	const pc = mod12(note.pitch);
	if (!band.tonesAt(change).includes(pc) || band.tonesAt(note.time).includes(pc)) return false;
	const heldAcross = note.time + note.length > change + EPSILON;
	const repeatedOnIt =
		next !== null && Math.abs(next.time - change) < EPSILON && next.pitch === note.pitch;
	return heldAcross || repeatedOnIt;
}

/**
 * @param {Note} note
 * @param {Note | null} next
 * @param {boolean} onBoom
 */
function isTarget(note, next, onBoom) {
	if (onBoom || note.length > LONG_NOTE + EPSILON) return true;
	if (!next || next.time > note.time + note.length + EPSILON) return true; // a rest follows
	return Math.abs(next.pitch - note.pitch) > STEP || next.pitch === note.pitch;
}

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;
