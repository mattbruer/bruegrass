/**
 * What each melody note is doing against the band's chords: the Berklee
 * text's target and approach notes (pp. 11–14, 106; docs/theory/chord-scales.md),
 * plus anticipations and suspensions. Plain data in and out, so the harmony
 * parts, the chord suggestions and (later) the guitar's and mandolin's
 * voicings can all read the melody the same way.
 *
 * Beats have strengths (docs/theory/applying-the-theory.md, call A): the
 * downbeat 3, the bass's other beat (beat 3 in 4/4) 2, the other beats 1,
 * off-beats 0. "Strong" means 2 or more.
 *
 * - target: heard as the chord. It sounds as the chord changes, lands on a
 *   strong beat, lasts longer than a beat, or is followed by a leap or a rest.
 * - approach: a quick note on a weak beat that isn't heard as the chord: a
 *   passing note (steps on), a neighbour (steps away and back) or an escape
 *   tone (stepped to, then left by a leap) (call C).
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
/** A beat this strong or stronger is a strong beat. */
const STRONG = 2;
const EPSILON = 1e-6;

/**
 * @typedef {{ time: number, length: number, pitch: number }} Note time and length in quarter notes, pitch MIDI
 * @typedef {'target' | 'approach' | 'anticipation' | 'suspension' | 'retardation'} Role
 * @typedef {'the chord starts' | 'a strong beat' | 'a long note' | 'a rest follows' | 'a leap follows'
 *   | 'the next note repeats it' | 'nothing else plays here'} TargetReason
 * @typedef {'passing' | 'neighbour' | 'escape'} ApproachKind
 * @typedef {0 | 1 | 2 | 3} Strength
 * @typedef {Note & {
 *   role: Role, strength: Strength, onBoom: boolean, chordTime: number, resolvesTo: number | null,
 *   because: TargetReason | null, kind: ApproachKind | null
 * }} RoledNote
 *   chordTime: when the chord it belongs to is sounding (the next chord's for
 *   an anticipation, the previous chord's for a suspension, its own otherwise);
 *   resolvesTo: the note a suspension or retardation steps to; because: why a
 *   target is one (shown to the user, so in words); onBoom: a strong beat (strength 2 or 3);
 *   kind: what sort of approach note it is
 * @typedef {{
 *   strengthAt: (time: number) => Strength,
 *   changes: number[],
 *   tonesAt: (time: number) => number[]
 * }} Band
 *   strengthAt: how strong the beat is then; changes: when the chord changes;
 *   tonesAt: the pitch classes of the chord sounding then (none: no chord)
 */

/**
 * @param {Note[]} notes the melody, in time order
 * @param {Band} band
 * @returns {RoledNote[]}
 */
export function noteRoles(notes, band) {
	return notes.map((note, i) => {
		const previous = notes[i - 1] ?? null;
		const next = notes[i + 1] ?? null;
		const strength = band.strengthAt(note.time);
		const onBoom = strength >= STRONG;
		return { ...note, strength, onBoom, ...roleOf(note, previous, next, onBoom, band) };
	});
}

/**
 * @param {Note} note
 * @param {Note | null} previous
 * @param {Note | null} next
 * @param {boolean} onBoom
 * @param {Band} band
 * @returns {{
 *   role: Role, chordTime: number, resolvesTo: number | null, because: TargetReason | null,
 *   kind: ApproachKind | null
 * }}
 */
function roleOf(note, previous, next, onBoom, band) {
	const pc = mod12(note.pitch);
	const changeAhead = band.changes.find(
		(change) =>
			change > note.time + EPSILON &&
			change - note.time <= EARLIEST_ANTICIPATION + EPSILON &&
			change <= note.time + note.length + EPSILON
	);
	if (changeAhead !== undefined && !onBoom && isAnticipation(note, next, changeAhead, band)) {
		return {
			role: 'anticipation',
			chordTime: changeAhead,
			resolvesTo: null,
			because: null,
			kind: null
		};
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
				return {
					role,
					chordTime: changeHere - EPSILON,
					resolvesTo: next.pitch,
					because: null,
					kind: null
				};
			}
		}
	}

	const kind = changeHere === undefined && !onBoom ? approachKind(note, previous, next) : null;
	if (kind)
		return { role: 'approach', chordTime: note.time, resolvesTo: null, because: null, kind };
	const because = changeHere !== undefined ? 'the chord starts' : targetReason(note, next, onBoom);
	return {
		role: 'target',
		chordTime: note.time,
		resolvesTo: null,
		because: because ?? 'a long note',
		kind: null
	};
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
 * What sort of quick weak-beat note this is, or null when it's heard as the chord.
 * @param {Note} note
 * @param {Note | null} previous
 * @param {Note | null} next
 * @returns {ApproachKind | null}
 */
function approachKind(note, previous, next) {
	if (note.length > LONG_NOTE + EPSILON) return null;
	if (!next || next.time > note.time + note.length + EPSILON) return null; // a rest follows
	const stepsOn = isStep(note.pitch, next.pitch);
	const steppedTo = previous !== null && isStep(previous.pitch, note.pitch);
	if (stepsOn) return steppedTo && previous.pitch === next.pitch ? 'neighbour' : 'passing';
	const leapsOn = Math.abs(next.pitch - note.pitch) > STEP;
	return steppedTo && leapsOn ? 'escape' : null;
}

/**
 * Why a note is heard as the chord.
 * @param {Note} note
 * @param {Note | null} next
 * @param {boolean} onBoom
 * @returns {TargetReason | null}
 */
function targetReason(note, next, onBoom) {
	if (onBoom) return 'a strong beat';
	if (note.length > LONG_NOTE + EPSILON) return 'a long note';
	if (!next || next.time > note.time + note.length + EPSILON) return 'a rest follows';
	if (Math.abs(next.pitch - note.pitch) > STEP) return 'a leap follows';
	if (next.pitch === note.pitch) return 'the next note repeats it';
	return null;
}

/**
 * A half or whole step, up or down.
 * @param {number} from
 * @param {number} to
 */
function isStep(from, to) {
	return from !== to && Math.abs(to - from) <= STEP;
}

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;

/**
 * How strong a beat is, from where it falls in its bar: the downbeat 3, the
 * bass's other beats 2, other beats 1, anything between beats 0.
 * @param {number} quarters from the bar's start
 * @param {number[]} booms where the bass plays in the bar (quarters from its start)
 * @returns {Strength}
 */
export function beatStrength(quarters, booms) {
	if (Math.abs(quarters) < EPSILON) return 3;
	if (booms.some((boom) => Math.abs(boom - quarters) < EPSILON)) return 2;
	return Math.abs(quarters - Math.round(quarters)) < EPSILON ? 1 : 0;
}
