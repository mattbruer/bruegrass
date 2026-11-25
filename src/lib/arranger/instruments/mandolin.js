/**
 * Mandolin chop: a short, percussive closed chord on the off-beats (with the
 * guitar's chuck), voiced from the chord's notes (voicing.js) as low on the
 * neck as it goes: high chops jump out on the E course (the user's ear).
 * No open strings, so every chord can be choked off.
 *
 * Samples live in static/samples/mando/{G,D,A,E}{0..14}.mp3, one per course
 * and fret, with the choke already recorded, so each note plays to its end.
 * A chop is a strum, but a percussive one: its own articulation (articulation.js)
 * and the sound on top of it (chopSound.js).
 */
import { rootPitchClass } from './guitar.js';
import { withoutBass, withoutVariant } from './chordBook.js';
import { readChordName } from '../theory/chordTypes.js';
import { chordShapes } from './voicing.js';
import { nextVoicing, register } from './voiceLeading.js';
import { rhythm } from '../chart/timeline.js';
import { hitAt, hitSpans } from '../chart/hits.js';
import { createRng } from './seededRandom.js';
import { secondsPerQuarter } from '../chart/tempo.js';
import { ARTICULATIONS } from './articulation.js';

/** Course sample prefixes, G D A E. */
export const COURSES = ['G', 'D', 'A', 'E'];
/** Open courses, G D A E (MIDI). */
const OPEN_MIDI = [55, 62, 69, 76];
/** Highest fret with a sample. */
const MAX_FRET = 14;
/** How far apart a chop's frets may be (one hand). */
const CHOP_SPAN = 5;

/**
 * The ways a chop is held, voiced from the chord's notes: every course
 * fretted, or the low three with the E course muted (C: 5-2-3-x). No open
 * strings, so it can be choked, and never a muted low course. The 5th may be
 * left out (C: C E C). Which one plays is voice leading's choice.
 * @type {import('./voicing.js').Instrument[]}
 */
const CHOP_HANDS = [OPEN_MIDI, OPEN_MIDI.slice(0, 3)].map((strings) => ({
	strings,
	lowestFret: 1,
	highestFret: MAX_FRET,
	span: CHOP_SPAN,
	fewestStrings: strings.length,
	rootInBass: false,
	everyString: true,
	fifthOptional: true,
	score: (shape) => -register(pitchesOf(shape))
}));

/**
 * The pitches a chop sounds, G course up; muted courses left out.
 * @param {(number | null)[]} frets
 */
function pitchesOf(frets) {
	return frets.flatMap((fret, course) => (fret === null ? [] : [OPEN_MIDI[course] + fret]));
}

const STROKE_GAP = 0.004; // s between courses on the downstroke (G → E)
const LEVEL_JITTER_DB = 1.5; // per chop, so it doesn't sound machine-gunned

/** Hits the mandolin plays: a chop can't ring, so it lays out on a ringing one. */
const CHOPPED_HITS = /** @type {import('../chart/hits.js').Hit[]} */ (['choke']);

/** How the pick meets the strings on a chop. */
export const CHOP_ARTICULATION = ARTICULATIONS.chop;

/**
 * @typedef {{ time: number, course: number, fret: number, pitch: number, levelDb: number }} MandoNote
 */

/** @typedef {{ frets: (number | null)[], pitches: number[] }} Chop frets G D A E, null = muted */

/** @type {Map<string, Chop[]>} */
const choices = new Map();

/**
 * Every chop that holds a chord, worked out the first time it's asked for,
 * then remembered.
 * @param {string} name
 * @param {number} capo transposes to concert pitch, like the guitar
 * @returns {Chop[]}
 */
function chopChoices(name, capo) {
	const root = (rootPitchClass(name) + capo) % 12;
	const type = readChordName(withoutBass(withoutVariant(name)))?.type;
	if (!type) throw new Error(`No mandolin chop shape for ${name}`);
	const id = `${root}${type.suffix}`;
	if (!choices.has(id)) {
		const chops = CHOP_HANDS.flatMap((hand) => chordShapes(hand, { root, type })).map((shape) => {
			const frets = COURSES.map((_, course) => shape[course] ?? null);
			return { frets, pitches: pitchesOf(frets) };
		});
		if (chops.length === 0) throw new Error(`No mandolin chop shape for ${name}`);
		choices.set(id, chops);
	}
	return /** @type {Chop[]} */ (choices.get(id));
}

/**
 * The chop for a chord: the lowest, or after another chop, the nearest one
 * (voiceLeading.js).
 * @param {string} name
 * @param {number} [capo]
 * @param {Chop | null} [previous] the chop before it
 * @returns {Chop}
 */
export function chopVoicing(name, capo = 0, previous = null) {
	return nextVoicing(chopChoices(name, capo), previous);
}

/**
 * A chop on every off-beat chuck of the rhythm grid (with the guitar's strum),
 * as one note per fretted course, struck G → E, each chop led smoothly from
 * the one before. On a hit (chart/hits.js) the mandolin
 * plays only the hits it chops (CHOPPED_HITS), one chop on the hit itself,
 * then nothing until the next chord; it lays out on the rest.
 * @param {{ name?: string, measures: string[][] }[]} sections
 * @param {{ capo?: number, bpm?: number }} options
 * @returns {MandoNote[]}
 */
export function chopNotes(sections, { capo = 0, bpm = 120 } = {}) {
	const quarter = secondsPerQuarter(bpm);
	const rng = createRng(7);
	const { beats, slots } = rhythm(sections);
	const hits = hitSpans(sections);
	/** @type {Chop | null} */
	let previous = null;
	return beats.flatMap((beat) => {
		const hit = hitAt(beat.time, hits);
		const onTheHit =
			hit !== undefined && CHOPPED_HITS.includes(hit.hit) && Math.abs(hit.start - beat.time) < 1e-6;
		if (hit ? !onTheHit : beat.role !== 'chuck') return [];
		previous = chopVoicing(slots[beat.slot].name, capo, previous);
		const { frets } = previous;
		const time = beat.time * quarter;
		const levelDb = CHOP_ARTICULATION.levelDb + (rng() * 2 - 1) * LEVEL_JITTER_DB;
		return frets.flatMap((fret, course) =>
			fret === null
				? []
				: [
						{
							time: time + course * STROKE_GAP,
							course,
							fret,
							pitch: OPEN_MIDI[course] + fret,
							levelDb
						}
					]
		);
	});
}

/**
 * @param {number} course index into COURSES
 * @param {number} fret
 */
export function mandoSampleUrl(course, fret) {
	if (fret > MAX_FRET) {
		throw new Error(
			`Fret ${fret} on the mandolin ${COURSES[course]} string is above fret ${MAX_FRET}`
		);
	}
	return `/samples/mando/${COURSES[course]}${fret}.mp3`;
}
