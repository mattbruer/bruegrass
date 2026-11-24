/**
 * The band's own bluegrass bass part, independent of the guitar's boom notes.
 *
 * - One note on each boom of the rhythm grid: beats 1 and 3 in 4/4, beat 1
 *   in 3/4 (a waltz bass holds the downbeat, so root and fifth alternate
 *   bar to bar). Root first, then the fifth, moving the opposite way to the
 *   guitar's boom notes (guitar goes up to its fifth → bass goes down to the
 *   fifth below, and vice versa).
 * - Each new root is taken in whichever octave is closest to the last note,
 *   leaning low, so the line moves by small steps rather than jumping.
 * - Notes are released early (punchy, not organ-like), with the odd
 *   staccato note on beat 3.
 *
 * Pitches use the same MIDI numbering as the exported bass track (the open
 * low E of the bass is 40), and are in concert pitch, so the capo transposes
 * the line. Choices are seeded, so the same arrangement always exports the
 * same bass part.
 */
import {
	alternatingPitchClass,
	bassNote,
	fifthInterval,
	midiNote,
	rootPitchClass,
	slashBassPitchClass
} from './guitar.js';
import { rhythm } from '../chart/timeline.js';
import { createRng } from './seededRandom.js';
import { UPRIGHT_RANGE } from './instrumentRanges.js';

/** Bass range in this file's numbering: open E (40) up to the open G string (55). */
const LOW = UPRIGHT_RANGE.lowest;
const HIGH = 55;
/** A fifth above the root may reach a little higher, up the G string. */
const FIFTH_HIGH = 60;
/** How strongly the line prefers the low end of the range (per semitone above LOW). */
const LOW_PULL = 0.25;

/* Articulation: fraction of each note's length it is held */
const GATE = { downbeat: 0.7, backbeat: 0.6, staccato: 0.35 };
const STACCATO_CHANCE = 0.15; // of beat-3 notes
const GATE_JITTER = 0.08; // ± fraction of the note length
const VELOCITY = { downbeat: 120, backbeat: 112 }; // a strong, driving bass
const VELOCITY_JITTER = 4;

/**
 * @typedef {{ beat: number, length: number, gate: number, pitch: number, velocity: number }} BassNote
 * @typedef {'downbeat' | 'backbeat'} Role
 * @typedef {{ beat: number, length: number, pitch: number, role: Role }} RawNote
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ capo?: number }} options
 * @returns {BassNote[]} beats are quarter notes from the start
 */
export function bassLine(sections, { capo = 0 } = {}) {
	const { beats, slots } = rhythm(sections);
	/** @type {RawNote[]} */
	const notes = [];
	let chord = { root: LOW, fifth: LOW };
	let previousSlot = null;
	let boomOfChord = 0;

	for (const beat of beats) {
		if (beat.role !== 'boom') continue;
		const slot = slots[beat.slot];
		// A new chord, the same one starting a new section, or a hit starts on its root
		const sameChord =
			previousSlot !== null &&
			previousSlot.name === slot.name &&
			previousSlot.section === slot.section &&
			!slot.hit;
		if (sameChord) boomOfChord++;
		else {
			chord = placeChord(slot.name, notes.at(-1)?.pitch ?? LOW, capo);
			boomOfChord = 0;
		}
		previousSlot = slot;

		notes.push({
			beat: beat.time,
			length: beat.length,
			pitch: boomOfChord % 2 === 0 ? chord.root : chord.fifth,
			role: beat.beatInBar === 0 ? 'downbeat' : 'backbeat'
		});
	}
	return articulate(notes);
}

/**
 * Where a chord's root and fifth go, near a pitch.
 * @param {string} name
 * @param {number} near
 * @param {number} capo
 */
function placeChord(name, near, capo) {
	const slashBass = slashBassPitchClass(name);
	if (slashBass !== null) {
		// The slash note is the bass's root, alternating with the chord's fifth (or root)
		const bass = nearest((slashBass + capo) % 12, near);
		return { root: bass, fifth: nearest((alternatingPitchClass(name) + capo) % 12, bass) };
	}
	let root = nearest((rootPitchClass(name) + capo) % 12, near);
	let fifth = contraryFifth(name, root);
	if (fifth === null) {
		// Move the root an octave so the fifth can go the contrary way
		// (e.g. G: open G string down to open D, against the guitar's G up to D)
		for (const other of [root + 12, root - 12]) {
			const otherFifth = other >= LOW && other <= HIGH ? contraryFifth(name, other) : null;
			if (otherFifth !== null) {
				root = other;
				fifth = otherFifth;
				break;
			}
		}
	}
	const up = fifthInterval(name);
	fifth ??= root - (12 - up) >= LOW ? root - (12 - up) : root + up;
	return { root, fifth };
}

/**
 * Release each note early, like a bassist muting between notes, with a
 * little natural variation in length and attack.
 * @param {RawNote[]} notes
 * @returns {BassNote[]}
 */
function articulate(notes) {
	const rng = createRng(1);
	const jitter = (/** @type {number} */ amount) => (rng() * 2 - 1) * amount;

	return notes.map((note) => {
		const staccato = note.role === 'backbeat' && rng() < STACCATO_CHANCE;
		const base = staccato ? GATE.staccato : GATE[note.role];
		return {
			beat: note.beat,
			length: note.length,
			pitch: note.pitch,
			gate: Math.min(0.95, Math.max(0.2, base + jitter(GATE_JITTER))),
			velocity: Math.min(127, Math.round(VELOCITY[note.role] + jitter(VELOCITY_JITTER)))
		};
	});
}

/**
 * The pitch with this pitch class in the bass range closest to `near`,
 * leaning toward the low end where a bass player lives.
 * @param {number} pc
 * @param {number} near
 */
function nearest(pc, near) {
	let best = null;
	let bestScore = Infinity;
	for (let pitch = LOW; pitch <= HIGH; pitch++) {
		if (pitch % 12 !== pc) continue;
		const score = Math.abs(pitch - near) + (pitch - LOW) * LOW_PULL;
		if (score < bestScore) {
			best = pitch;
			bestScore = score;
		}
	}
	return /** @type {number} */ (best);
}

/**
 * The fifth moving the opposite way to the guitar's boom: if the guitar's
 * fifth sits above its root, the bass takes the fifth below, and vice versa.
 * @param {string} name chord name
 * @param {number} root bass root pitch
 * @returns {number | null} null when that fifth is out of range
 */
function contraryFifth(name, root) {
	const guitarRoot = bassNote(name, 'root');
	const guitarFifth = bassNote(name, 'fifth');
	const guitarUp =
		midiNote(guitarFifth.string, guitarFifth.fret) > midiNote(guitarRoot.string, guitarRoot.fret);

	const below = root - (12 - fifthInterval(name));
	const above = root + fifthInterval(name);
	if (guitarUp) return below >= LOW ? below : null;
	return above <= FIFTH_HIGH ? above : null;
}
