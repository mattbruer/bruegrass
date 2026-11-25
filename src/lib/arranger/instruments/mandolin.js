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
import { voiceChord } from './voicing.js';
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
 * A chop voiced from the chord's notes: all four courses fretted (so it can
 * be choked), the lowest that holds the chord.
 * @type {import('./voicing.js').Instrument}
 */
const CHOP = {
	strings: OPEN_MIDI,
	lowestFret: 1,
	highestFret: MAX_FRET,
	span: CHOP_SPAN,
	fewestStrings: 4,
	rootInBass: false,
	everyString: true,
	score: (shape) => -height(shape.map(Number))
};

/**
 * How high a chop sits: the sum of its frets (every course is fretted, so
 * that's how high its notes are), then its top note, so the high E stays low.
 * Lower is better.
 * @param {number[]} frets G D A E
 */
function height(frets) {
	const sum = frets.reduce((total, fret) => total + fret, 0);
	return sum + frets[frets.length - 1] / 100;
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

/** @type {Map<string, { frets: number[], pitches: number[] }>} */
const chops = new Map();

/**
 * The chop voicing for a chord, worked out the first time it's asked for,
 * then remembered.
 * @param {string} name
 * @param {number} [capo] transposes to concert pitch, like the guitar
 * @returns {{ frets: number[], pitches: number[] }}
 */
export function chopVoicing(name, capo = 0) {
	const root = (rootPitchClass(name) + capo) % 12;
	const type = readChordName(withoutBass(withoutVariant(name)))?.type;
	if (!type) throw new Error(`No mandolin chop shape for ${name}`);
	const id = `${root}${type.suffix}`;
	if (!chops.has(id)) {
		const shape = voiceChord(CHOP, { root, type });
		if (!shape) throw new Error(`No mandolin chop shape for ${name}`);
		const frets = shape.map(Number);
		chops.set(id, { frets, pitches: frets.map((fret, course) => OPEN_MIDI[course] + fret) });
	}
	return /** @type {{ frets: number[], pitches: number[] }} */ (chops.get(id));
}

/**
 * A chop on every off-beat chuck of the rhythm grid (with the guitar's strum),
 * as one note per course, struck G → E. On a hit (chart/hits.js) the mandolin
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
	return beats.flatMap((beat) => {
		const hit = hitAt(beat.time, hits);
		const onTheHit =
			hit !== undefined && CHOPPED_HITS.includes(hit.hit) && Math.abs(hit.start - beat.time) < 1e-6;
		if (hit ? !onTheHit : beat.role !== 'chuck') return [];
		const { frets } = chopVoicing(slots[beat.slot].name, capo);
		const time = beat.time * quarter;
		const levelDb = CHOP_ARTICULATION.levelDb + (rng() * 2 - 1) * LEVEL_JITTER_DB;
		return frets.map((fret, course) => ({
			time: time + course * STROKE_GAP,
			course,
			fret,
			pitch: OPEN_MIDI[course] + fret,
			levelDb
		}));
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
