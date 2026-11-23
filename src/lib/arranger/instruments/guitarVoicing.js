/**
 * Guitar shapes built from a chord's notes, for any chord the theory knows
 * (theory/chordTypes.js), so the band can play a chord nobody typed a shape
 * for. Only the bottom of the neck (open position), like the built-in
 * shapes: the backup guitar's sound. Your own shapes and the built-in ones
 * still come first (chordBook.js).
 *
 * Every combination of open, fretted and muted strings is tried. A shape
 * needs the root in the bass, every note of the chord (one of four notes or
 * more may leave out its 5th, as guitarists do), strings sounding from the
 * bass up without gaps, and to fit one hand. The best one rings most: more
 * strings, more open strings, lower frets.
 */
import { CHORD_TYPES, toneSemitones } from '../theory/chordTypes.js';

/** Open strings, low E to high e (MIDI). */
const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
/** The highest fret a generated shape uses: the bottom of the neck only. */
const HIGHEST_FRET = 4;
/** Fretted notes must sit within this many frets of each other. */
const HAND_SPAN = 3;
const FINGERS = 4;
const FEWEST_STRINGS = 4;
/** What makes one shape better than another. */
const SCORE = { perString: 2, perOpenString: 1.5, perFret: 0.5 };
const NOTE_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** @typedef {(number | null)[]} Shape six frets, low E to high e, null = muted */

/** @type {Map<string, Shape | null>} */
const made = new Map();

/**
 * A shape for a chord name, or null when the name isn't a chord the theory
 * knows or no open-position shape holds it.
 * @param {string} name without a slash bass or variant, e.g. "Cmaj7", "F#m7b5"
 * @returns {Shape | null}
 */
export function generatedShape(name) {
	if (!made.has(name)) made.set(name, shapeFor(name));
	return made.get(name) ?? null;
}

/** @param {string} name */
function shapeFor(name) {
	const match = name.match(/^([A-G])([#b]?)(.*)$/);
	const type =
		match &&
		CHORD_TYPES.find((each) => each.suffix === match[3] || each.aliases.includes(match[3]));
	if (!match || !type) return null;
	const sign = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	const root = (NOTE_PITCH[/** @type {keyof NOTE_PITCH} */ (match[1])] + sign + 12) % 12;
	const tones = toneSemitones(type).map((tone) => (root + tone) % 12);
	const needed = tones.length > 3 ? tones.filter((pc) => pc !== (root + 7) % 12) : tones;
	return bestShape(root, tones, needed);
}

/**
 * @param {number} root pitch class
 * @param {number[]} tones every pitch class the chord may sound
 * @param {number[]} needed the ones it must sound
 */
function bestShape(root, tones, needed) {
	/** @type {Shape | null} */
	let best = null;
	let bestScore = -Infinity;
	for (const shape of allShapes(tones)) {
		if (!isPlayable(shape, root, needed)) continue;
		const score = scoreOf(shape);
		if (score > bestScore) {
			best = shape;
			bestScore = score;
		}
	}
	return best;
}

/**
 * Every shape whose sounding strings all play chord notes.
 * @param {number[]} tones
 * @returns {Generator<Shape>}
 */
function* allShapes(tones, strings = /** @type {Shape} */ ([])) {
	if (strings.length === OPEN_STRINGS.length) {
		yield strings;
		return;
	}
	const open = OPEN_STRINGS[strings.length];
	yield* allShapes(tones, [...strings, null]);
	for (let fret = 0; fret <= HIGHEST_FRET; fret++) {
		if (tones.includes((open + fret) % 12)) yield* allShapes(tones, [...strings, fret]);
	}
}

/**
 * @param {Shape} shape
 * @param {number} root
 * @param {number[]} needed
 */
function isPlayable(shape, root, needed) {
	const lowest = shape.findIndex((fret) => fret !== null);
	if (lowest === -1 || (OPEN_STRINGS[lowest] + Number(shape[lowest])) % 12 !== root) return false;
	const sounding = shape.slice(lowest);
	if (sounding.includes(null) || sounding.length < FEWEST_STRINGS) return false;
	const pitches = sounding.map((fret, i) => (OPEN_STRINGS[lowest + i] + Number(fret)) % 12);
	if (!needed.every((pc) => pitches.includes(pc))) return false;
	return fitsOneHand(/** @type {number[]} */ (sounding));
}

/**
 * Fretted notes within the hand's span and no more than four fingers,
 * counting a barre across the lowest fret as one (with no open string under it).
 * @param {number[]} frets
 */
function fitsOneHand(frets) {
	const fretted = frets.filter((fret) => fret > 0);
	if (fretted.length === 0) return true;
	const lowest = Math.min(...fretted);
	if (Math.max(...fretted) - lowest > HAND_SPAN) return false;
	if (fretted.length <= FINGERS) return true;
	const barre = !frets.includes(0);
	return barre && fretted.filter((fret) => fret > lowest).length <= FINGERS - 1;
}

/** @param {Shape} shape */
function scoreOf(shape) {
	const sounding = shape.filter((fret) => fret !== null);
	const open = sounding.filter((fret) => fret === 0).length;
	const frets = sounding.reduce((sum, fret) => sum + Number(fret), 0);
	return sounding.length * SCORE.perString + open * SCORE.perOpenString - frets * SCORE.perFret;
}
