/**
 * Mandolin chop: a short, percussive closed chord on the off-beats (with the
 * guitar's chuck), using the movable chop shapes bluegrass players use for
 * major and minor chords, and a chop voiced from the chord's notes for every
 * other kind (voicing.js). No open strings, so every chord can be choked off.
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
/** Players stay around this fret, choosing whichever shape sits closest. */
const HOME_FRET = 5;

/**
 * Movable chop shapes: which course holds the root, and each course's fret
 * as an offset from that root fret (G D A E).
 */
const SHAPES = [
	// "G chop": 7-5-2-3 for G
	{ name: 'G chop', rootString: 1, major: [2, 0, -3, -2], minor: [2, 0, -4, -2] },
	// "A chop" (3-finger): 2-2-4-5 for A
	{ name: 'A chop', rootString: 0, major: [0, 0, 2, 3], minor: [0, 0, 1, 3] },
	// "C chop": 5-2-3-3 for C
	{ name: 'C chop', rootString: 0, major: [0, -3, -2, -2], minor: [0, -4, -2, -2] }
];

/** Chord types the movable shapes above play; every other type is voiced from its notes (voicing.js). */
const PLAIN_CHOPS = ['', 'm'];

/**
 * A chop voiced from the chord's notes: all four courses fretted (so it can
 * be choked), near the home fret like the shapes above.
 * @type {import('./voicing.js').Instrument}
 */
const CHOP = {
	strings: OPEN_MIDI,
	lowestFret: 1,
	highestFret: MAX_FRET,
	span: 5,
	fewestStrings: 4,
	rootInBass: false,
	everyString: true,
	score: (shape) => {
		const frets = shape.map(Number);
		const average = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;
		return -Math.abs(average - HOME_FRET) - (Math.max(...frets) - Math.min(...frets)) * 0.1;
	}
};

const STROKE_GAP = 0.004; // s between courses on the downstroke (G → E)
const LEVEL_JITTER_DB = 1.5; // per chop, so it doesn't sound machine-gunned

/** Hits the mandolin plays: a chop can't ring, so it lays out on a ringing one. */
const CHOPPED_HITS = /** @type {import('../chart/hits.js').Hit[]} */ (['choke']);

/** How the pick meets the strings on a chop. */
export const CHOP_ARTICULATION = ARTICULATIONS.chop;

/**
 * @typedef {{ time: number, course: number, fret: number, pitch: number, levelDb: number }} MandoNote
 */

/**
 * The chop voicing for a chord, closest to the home position.
 * @param {string} name
 * @param {number} [capo] transposes to concert pitch, like the guitar
 * @returns {{ frets: number[], pitches: number[], shape: string }}
 */
export function chopVoicing(name, capo = 0) {
	const pc = (rootPitchClass(name) + capo) % 12;
	const quality = /^[A-G][#b]?m(?!aj)/.test(name) ? 'minor' : 'major';
	const type = readChordName(withoutBass(withoutVariant(name)))?.type;
	if (type && !PLAIN_CHOPS.includes(type.suffix)) return builtChop(name, { root: pc, type });

	let best = null;
	let bestScore = Infinity;
	for (const shape of SHAPES) {
		for (let root = 0; root <= MAX_FRET; root++) {
			if ((OPEN_MIDI[shape.rootString] + root) % 12 !== pc) continue;
			const frets = shape[quality].map((offset) => root + offset);
			if (frets.some((fret) => fret < 1 || fret > MAX_FRET)) continue;
			const average = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;
			const score = Math.abs(average - HOME_FRET);
			if (score < bestScore) {
				best = { frets, shape: shape.name };
				bestScore = score;
			}
		}
	}
	if (!best) throw new Error(`No mandolin chop shape for ${name}`);
	return { ...best, pitches: best.frets.map((fret, course) => OPEN_MIDI[course] + fret) };
}

/** @type {Map<string, { frets: number[], pitches: number[], shape: string }>} */
const builtChops = new Map();

/**
 * A chop for a chord the movable shapes don't play (a 7th, maj7, dim…),
 * worked out the first time it's asked for, then remembered.
 * @param {string} name
 * @param {import('./voicing.js').Chord} chord at concert pitch
 */
function builtChop(name, chord) {
	const id = `${chord.root}${chord.type.suffix}`;
	if (!builtChops.has(id)) {
		const shape = voiceChord(CHOP, chord);
		if (!shape) throw new Error(`No mandolin chop shape for ${name}`);
		const frets = shape.map(Number);
		builtChops.set(id, {
			frets,
			shape: 'built',
			pitches: frets.map((fret, course) => OPEN_MIDI[course] + fret)
		});
	}
	return /** @type {{ frets: number[], pitches: number[], shape: string }} */ (builtChops.get(id));
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
