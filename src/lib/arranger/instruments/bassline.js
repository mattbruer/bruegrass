/**
 * A basic bluegrass bass part, independent of the guitar's boom notes.
 *
 * - One note on each boom of the rhythm grid: beats 1 and 3 in 4/4, beat 1
 *   in 3/4 (a waltz bass holds the downbeat, so root and fifth alternate
 *   bar to bar). Root first, then the fifth, moving the opposite way to the
 *   guitar's boom notes (guitar goes up to its fifth → bass goes down to the
 *   fifth below, and vice versa).
 * - Each new root is taken in whichever octave is closest to the last note,
 *   leaning low, so the line moves by small steps rather than jumping.
 * - Into a chord change the bass may lead in with scale steps:
 *     chord held 1 bar:  keep the fifth if it's already a step from the next
 *                        root (G D │ C), otherwise two quarter notes walking
 *                        into it (C · B A │ G)
 *     chord held 2+ bars: last bar walks in quarters, "1 1 2 3 │ 4"
 *                        (G G A B │ C), or in 3/4 "1 2 3 │ 4" (G A B │ C)
 *   Not every change gets a lead-in, and a repeated section never plays
 *   exactly the same line as its previous time through.
 * - With a tune, wherever the lead holds a note longer than a half note, the bass
 *   walks in quarters under it into its next note (bassFills.js), on top
 *   of everything above.
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
import { fillUnderHeldNotes } from './bassFills.js';
import { heldSpans } from '../bass/melodySpace.js';

/** Bass range in this file's numbering: open E (40) up to the open G string (55). */
const LOW = 40;
const HIGH = 55;
/** A fifth above the root may reach a little higher, up the G string. */
const FIFTH_HIGH = 60;
/** How strongly the line prefers the low end of the range (per semitone above LOW). */
const LOW_PULL = 0.25;

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

/* Variation: how often each choice goes the less common way */
const LEAD_CHANCE = 0.65; // lead into a chord change at all
const OTHER_SIDE_CHANCE = 0.25; // approach the next root from the far side

/* Articulation: fraction of each note's length it is held */
const GATE = { downbeat: 0.7, backbeat: 0.6, walk: 0.8, staccato: 0.35 };
const STACCATO_CHANCE = 0.15; // of beat-3 notes
const GATE_JITTER = 0.08; // ± fraction of the note length
const VELOCITY = { downbeat: 120, backbeat: 112, walk: 108 }; // a strong, driving bass
const VELOCITY_JITTER = 4;

/**
 * @typedef {{ beat: number, length: number, gate: number, pitch: number, velocity: number }} BassNote
 * @typedef {'downbeat' | 'backbeat' | 'walk'} Role
 * @typedef {{ beat: number, length: number, pitch: number, role: Role }} RawNote
 * @typedef {{ beat: number, length: number, bar: number, downbeat: boolean }} Boom a bass beat, in quarters
 * @typedef {{ name: string, section: number, booms: Boom[] }} Run
 * @typedef {{ lead: boolean, otherSide: boolean }} Decision
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ capo?: number, tuneOnsets?: number[] | null }} options
 *   tuneOnsets: when the tune's lead notes start, in quarters from the
 *   start (bass/melodySpace.js), or null without a tune
 * @returns {BassNote[]} beats are quarter notes from the start
 */
export function bassLine(sections, { capo = 0, tuneOnsets = null } = {}) {
	const { beats, slots: positions, quarters } = rhythm(sections);
	if (positions.length === 0) return [];

	// The bass plays on the booms; group consecutive booms of the same chord,
	// starting fresh at each section
	/** @type {Run[]} */
	const runs = [];
	for (const beat of beats) {
		if (beat.role !== 'boom') continue;
		const slot = positions[beat.slot];
		/** @type {Boom} */
		const boom = {
			beat: beat.time,
			length: beat.length,
			bar: beat.bar,
			downbeat: beat.beatInBar === 0
		};
		const last = runs.at(-1);
		if (last && last.name === slot.name && last.section === slot.section) last.booms.push(boom);
		else runs.push({ name: slot.name, section: slot.section, booms: [boom] });
	}

	// Which time through is this section? (same chords and meters = same section)
	const keys = sections.map((section) => JSON.stringify([section.measures, section.meters ?? []]));
	const occurrence = keys.map((key, i) => keys.slice(0, i).filter((other) => other === key).length);
	const previousOccurrence = keys.map((key, i) => keys.slice(0, i).lastIndexOf(key));

	/** @type {Decision[]} */
	const decisions = [];
	sections.forEach((_, i) => {
		const rng = createRng(hash(keys[i]) + occurrence[i] * 7919);
		for (const run of runs) {
			if (run.section !== i) continue;
			decisions[runs.indexOf(run)] = {
				lead: rng() < LEAD_CHANCE,
				otherSide: rng() < OTHER_SIDE_CHANCE
			};
		}
	});

	const context = { runs, capo, key: (rootPitchClass(positions[0].name) + capo) % 12 };
	let raw = render(context, decisions);

	// A repeated section must not play exactly what it played last time
	const sectionBeats = sections.map((_, i) => {
		const slots = positions.filter((slot) => slot.section === i);
		const last = slots.at(-1);
		return last ? { start: slots[0].start, end: last.start + last.length } : null;
	});
	/** @param {RawNote[]} notes @param {number} i */
	const sliceOf = (notes, i) => {
		const span = sectionBeats[i];
		if (!span) return '';
		return JSON.stringify(
			notes
				.filter((note) => note.beat >= span.start && note.beat < span.end)
				.map((note) => [note.beat - span.start, note.pitch])
		);
	};

	sections.forEach((_, i) => {
		const previous = previousOccurrence[i];
		if (previous < 0 || sliceOf(raw, i) !== sliceOf(raw, previous)) return;

		// Flip one choice at a time until this pass differs from the last one
		const sectionRuns = runs.flatMap((run, r) => (run.section === i ? [r] : []));
		const order = [...sectionRuns.slice(occurrence[i] % sectionRuns.length), ...sectionRuns];
		for (const r of order) {
			for (const field of /** @type {(keyof Decision)[]} */ (['lead', 'otherSide'])) {
				decisions[r] = { ...decisions[r], [field]: !decisions[r][field] };
				const attempt = render(context, decisions);
				if (sliceOf(attempt, i) !== sliceOf(attempt, previous)) {
					raw = attempt;
					return;
				}
				decisions[r] = { ...decisions[r], [field]: !decisions[r][field] };
			}
		}
	});

	const held = heldSpans(tuneOnsets, quarters);
	if (held.length > 0) {
		raw = fillUnderHeldNotes(raw, { held, bars: barSpans(beats), inScale: scaleOf(context.key) });
	}
	return articulate(raw);
}

/**
 * Each bar's start and end, in quarters.
 * @param {{ bar: number, time: number, length: number }[]} beats
 */
function barSpans(beats) {
	/** @type {{ start: number, end: number }[]} */
	const bars = [];
	for (const beat of beats) {
		const bar = (bars[beat.bar] ??= { start: beat.time, end: beat.time });
		bar.end = Math.max(bar.end, beat.time + beat.length);
	}
	return bars.filter(Boolean);
}

/**
 * Whether a pitch is in the key's major scale.
 * @param {number} key pitch class
 */
function scaleOf(key) {
	const scale = new Set(MAJOR_STEPS.map((step) => (key + step) % 12));
	return (/** @type {number} */ pitch) => scale.has(((pitch % 12) + 12) % 12);
}

/**
 * The bass line for a set of decisions, without articulation.
 * @param {{ runs: Run[], capo: number, key: number }} context
 * @param {Decision[]} decisions
 * @returns {RawNote[]}
 */
function render({ runs, capo, key }, decisions) {
	const inScale = scaleOf(key);
	/** Scale notes strictly between two pitches, in the direction of travel. */
	const stepsBetween = (/** @type {number} */ from, /** @type {number} */ to) => {
		const dir = Math.sign(to - from);
		const notes = [];
		for (let p = from + dir; p !== to; p += dir) if (inScale(p)) notes.push(p);
		return notes;
	};
	/** @param {string} name */
	const rootPc = (name) => (rootPitchClass(name) + capo) % 12;

	/** @type {RawNote[]} */
	const notes = [];
	let previous = null;

	/**
	 * Where a chord's root and fifth go, near a pitch.
	 * @param {string} name
	 * @param {number} near
	 */
	const placeChord = (name, near) => {
		const slashBass = slashBassPitchClass(name);
		if (slashBass !== null) {
			// The slash note is the bass's root, alternating with the chord's fifth (or root)
			const bass = nearest((slashBass + capo) % 12, near);
			return { root: bass, fifth: nearest((alternatingPitchClass(name) + capo) % 12, bass) };
		}
		let root = nearest(rootPc(name), near);
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
	};

	runs.forEach((run, r) => {
		const decision = decisions[r];
		const { root, fifth } = placeChord(run.name, previous ?? LOW);

		// Lead toward where the next chord's root will actually be played
		const next = runs[r + 1];
		let target = next && next.name !== run.name ? placeChord(next.name, root).root : null;
		if (target !== null && decision.otherSide) {
			// Same note an octave away, so the run comes from the other direction
			const other = target + (target > root ? -12 : 12);
			if (other >= LOW && other <= HIGH && other !== root) target = other;
		}

		const { booms } = run;
		const lastBoom = booms[booms.length - 1];
		const runEnd = lastBoom.beat + lastBoom.length;
		// The booms in the run's last bar, where a walk would go
		const lastBar = booms.filter((boom) => boom.bar === lastBoom.bar);
		const spansBars = booms[0].bar !== lastBoom.bar;

		// How the run ends: plain, walk (last bar in quarters), or approach (last boom)
		/** @type {number[] | null} */
		let walk = null;
		/** @type {number[] | null} */
		let approach = null;
		if (target !== null && decision.lead) {
			const steps = stepsBetween(root, target);
			const walkLength = runEnd - lastBar[0].beat;
			if (spansBars && steps.length >= 1 && steps.length < walkLength) {
				// 4/4: "1 1 2 3 │ 4" (G G A B │ C); 3/4: "1 2 3 │ 4" (G A B │ C)
				walk = [...Array(walkLength - steps.length).fill(root), ...steps];
			} else if (booms.length >= 2 && !isStep(fifth, target)) {
				approach = steps.slice(-Math.min(2, lastBoom.length));
				if (approach.length === 0) approach = null;
			}
		}

		const plainBooms = walk ? booms.length - lastBar.length : booms.length;
		for (let i = 0; i < plainBooms; i++) {
			const boom = booms[i];

			if (i === booms.length - 1 && approach) {
				// Quarter notes stepping into the next root, the first one taking up any slack
				let beat = boom.beat;
				approach.forEach((pitch, j) => {
					const length = j === 0 ? boom.length - (approach.length - 1) : 1;
					notes.push({ beat, length, pitch, role: 'walk' });
					beat += length;
				});
				continue;
			}

			notes.push({
				beat: boom.beat,
				length: boom.length,
				pitch: i % 2 === 0 ? root : fifth,
				role: boom.downbeat ? 'downbeat' : 'backbeat'
			});
		}

		if (walk) {
			const start = lastBar[0].beat;
			walk.forEach((pitch, j) =>
				notes.push({
					beat: start + j,
					length: 1,
					pitch,
					role: j === 0 && lastBar[0].downbeat ? 'downbeat' : 'walk'
				})
			);
		}

		previous = notes.at(-1)?.pitch ?? root;
	});

	return notes;
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

/**
 * @param {number} a
 * @param {number} b
 */
function isStep(a, b) {
	const distance = Math.abs(a - b);
	return distance >= 1 && distance <= 2;
}

/** @param {string} text */
function hash(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
}
