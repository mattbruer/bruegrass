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
import { rhythm, slotPositions } from '../chart/timeline.js';
import { editedChop } from './chopEdits.js';
import { hitAt, hitSpans } from '../chart/hits.js';
import { createRng } from './seededRandom.js';
import { secondsPerQuarter } from '../chart/tempo.js';
import { ARTICULATIONS } from './articulation.js';

/** Course sample prefixes, G D A E. */
export const COURSES = ['G', 'D', 'A', 'E'];
/** Open courses, G D A E (MIDI). */
export const OPEN_MIDI = [55, 62, 69, 76];
/** Highest fret with a sample. */
export const MAX_FRET = 14;
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
export function pitchesOf(frets) {
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
 * The chord a chop holds, at concert pitch, as its root's pitch class and
 * type ("0m7" for Cm7, whatever it's called): what a chop you've changed is
 * saved for (chopEdits.js).
 * @param {string} name
 * @param {number} capo transposes to concert pitch, like the guitar
 */
export function chopChord(name, capo) {
	const root = (rootPitchClass(name) + capo) % 12;
	const type = readChordName(withoutBass(withoutVariant(name)))?.type;
	if (!type) throw new Error(`No mandolin chop shape for ${name}`);
	return { id: `${root}${type.suffix}`, root, type };
}

/**
 * Every chop that holds a chord, worked out the first time it's asked for,
 * then remembered.
 * @param {string} name
 * @param {number} capo
 * @returns {Chop[]}
 */
function chopChoices(name, capo) {
	const { id, root, type } = chopChord(name, capo);
	if (!choices.has(id)) {
		const chops = CHOP_HANDS.flatMap((hand) => chordShapes(hand, { root, type })).map((shape) =>
			chopOf(COURSES.map((_, course) => shape[course] ?? null))
		);
		if (chops.length === 0) throw new Error(`No mandolin chop shape for ${name}`);
		choices.set(id, chops);
	}
	return /** @type {Chop[]} */ (choices.get(id));
}

/** @param {(number | null)[]} frets */
export function chopOf(frets) {
	return { frets, pitches: pitchesOf(frets) };
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
 * @typedef {{ start: number, length: number, bar: number, name: string, chord: string, chop: Chop, edited: boolean }} SongChop
 *   start, length: where the chord is in the song (quarter notes from bar 1); bar: its bar, from 1; name: as written;
 *   chord: at concert pitch (chopChord's id); edited: you changed it (chopEdits.js)
 */

/**
 * The chop for each chord of the song, in order: yours where you've
 * changed it, else the band's, each led from the one before.
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ capo?: number, edits?: import('./chopEdits.js').ChopEdits, offset?: number }} [options]
 *   edits: your chops; offset: where these sections start in the song (quarters)
 * @returns {SongChop[]}
 */
export function songChops(sections, { capo = 0, edits = {}, offset = 0 } = {}) {
	/** @type {Chop | null} */
	let previous = null;
	return slotPositions(sections).map((slot) => {
		const start = slot.start + offset;
		const chord = chopChord(slot.name, capo).id;
		const yours = editedChop(edits, start, chord);
		const chop = yours ? chopOf(yours) : chopVoicing(slot.name, capo, previous);
		previous = chop;
		const bar = slot.bar + 1;
		return {
			start,
			length: slot.length,
			bar,
			name: slot.name,
			chord,
			chop,
			edited: yours !== null
		};
	});
}

/**
 * A chop on every off-beat chuck of the rhythm grid (with the guitar's strum),
 * as one note per fretted course, struck G → E, one chop per chord
 * (songChops: yours, or led smoothly from the one before). On a hit (chart/hits.js) the mandolin
 * plays only the hits it chops (CHOPPED_HITS), one chop on the hit itself,
 * then nothing until the next chord; it lays out on the rest.
 * @param {{ name?: string, measures: string[][] }[]} sections
 * @param {{ capo?: number, bpm?: number, edits?: import('./chopEdits.js').ChopEdits, offset?: number }} options
 *   edits: the chops you've changed; offset: where these sections start in the song (quarters)
 * @returns {MandoNote[]}
 */
export function chopNotes(sections, { capo = 0, bpm = 120, edits = {}, offset = 0 } = {}) {
	const quarter = secondsPerQuarter(bpm);
	const rng = createRng(7);
	const { beats } = rhythm(sections);
	const hits = hitSpans(sections);
	const chops = songChops(sections, { capo, edits, offset });
	return beats.flatMap((beat) => {
		const hit = hitAt(beat.time, hits);
		const onTheHit =
			hit !== undefined && CHOPPED_HITS.includes(hit.hit) && Math.abs(hit.start - beat.time) < 1e-6;
		if (hit ? !onTheHit : beat.role !== 'chuck') return [];
		const { frets } = chops[beat.slot].chop;
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
