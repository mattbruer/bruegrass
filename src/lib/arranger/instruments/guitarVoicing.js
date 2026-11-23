/**
 * Guitar shapes built from a chord's notes (voicing.js), for any chord the
 * theory knows (theory/chordTypes.js), so the band can play a chord nobody
 * typed a shape for. Only the bottom of the neck (open position), like the
 * built-in shapes: the backup guitar's sound. Your own shapes and the
 * built-in ones still come first (chordBook.js). Worked out the first time
 * a chord is asked for, then remembered.
 */
import { chordTypeOf } from '../theory/chordTypes.js';
import { voiceChord } from './voicing.js';

/** What makes one shape better: rings most, more strings, more open strings, lower frets. */
const SCORE = { perString: 2, perOpenString: 1.5, perFret: 0.5 };
const NOTE_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** @type {import('./voicing.js').Instrument} */
const OPEN_POSITION_GUITAR = {
	strings: [40, 45, 50, 55, 59, 64],
	lowestFret: 0,
	highestFret: 4, // the bottom of the neck only
	span: 3,
	fewestStrings: 4,
	rootInBass: true,
	everyString: false,
	score: (shape) => {
		const sounding = shape.filter((fret) => fret !== null);
		const open = sounding.filter((fret) => fret === 0).length;
		const frets = sounding.reduce((sum, fret) => sum + Number(fret), 0);
		return sounding.length * SCORE.perString + open * SCORE.perOpenString - frets * SCORE.perFret;
	}
};

/** @type {Map<string, import('./voicing.js').Shape | null>} */
const made = new Map();

/**
 * A shape for a chord name, or null when the name isn't a chord the theory
 * knows or no open-position shape holds it.
 * @param {string} name without a slash bass or variant, e.g. "Cmaj7", "F#m7b5"
 * @returns {import('./voicing.js').Shape | null}
 */
export function generatedShape(name) {
	if (!made.has(name)) {
		const chord = readChordName(name);
		made.set(name, chord && voiceChord(OPEN_POSITION_GUITAR, chord));
	}
	return made.get(name) ?? null;
}

/**
 * A chord name's root pitch class and type, or null.
 * @param {string} name e.g. "F#m7"
 */
export function readChordName(name) {
	const match = name.match(/^([A-G])([#b]?)(.*)$/);
	const type = match && chordTypeOf(match[3]);
	if (!match || !type) return null;
	const sign = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	return { root: (NOTE_PITCH[/** @type {keyof NOTE_PITCH} */ (match[1])] + sign + 12) % 12, type };
}
