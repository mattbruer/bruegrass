/**
 * A chord voiced on a fretted instrument, worked out when it's asked for:
 * every way of fretting, opening or muting each string is tried, and the
 * best shape that holds the chord's important notes wins. The instrument is
 * plain data (its strings, which frets, open strings or not, what makes a
 * shape good), so the guitar and the mandolin's chop share this.
 *
 * Which notes matter (theory): the chord's character comes first, its 3rd
 * (or a sus chord's 4th), 7th or 6th, altered 5th and added 9th; then the
 * root; the plain 5th is the first left out when the strings run short.
 */
import { toneSemitones } from '../theory/chordTypes.js';

/**
 * @typedef {(number | null)[]} Shape a fret per string, low to high; null = muted
 * @typedef {{
 *   strings: number[], lowestFret: number, highestFret: number, span: number,
 *   fewestStrings: number, rootInBass: boolean, everyString: boolean,
 *   fifthOptional?: boolean, score: (shape: Shape) => number
 * }} Instrument
 *   strings: open MIDI pitches, low to high; lowestFret 0 allows open strings;
 *   span: how far apart fretted notes may be; everyString: no muting (a chop);
 *   fifthOptional: the plain 5th is never needed, even in a triad (a chop)
 * @typedef {{ root: number, type: import('../theory/chordTypes.js').ChordType }} Chord
 */

const PERFECT_FIFTH = 7;
const FINGERS = 4;

/**
 * @param {Instrument} instrument
 * @param {Chord} chord
 * @returns {Shape | null} null: no shape holds the chord here
 */
export function voiceChord(instrument, chord) {
	const tones = toneSemitones(chord.type).map((tone) => (chord.root + tone) % 12);
	let best = null;
	let bestScore = -Infinity;
	for (const needed of whatToKeep(chord, tones, instrument)) {
		for (const shape of allShapes(instrument, tones)) {
			if (!holds(instrument, shape, chord.root, needed)) continue;
			const score = instrument.score(shape);
			if (score > bestScore) {
				best = shape;
				bestScore = score;
			}
		}
		if (best) return best;
	}
	return null;
}

/**
 * The notes a shape must sound, most complete first: every note; then
 * without the plain 5th (when the chord has four notes or more); then
 * without the root too, if there still aren't enough strings. An instrument
 * whose 5th is optional starts without it.
 * @param {Chord} chord
 * @param {number[]} tones
 * @param {Instrument} instrument
 * @returns {number[][]}
 */
function whatToKeep(chord, tones, instrument) {
	const strings = instrument.strings.length;
	const fifth = (chord.root + PERFECT_FIFTH) % 12;
	const withoutFifth = tones.filter((pc) => pc !== fifth);
	const choices = instrument.fifthOptional && tones.includes(fifth) ? [] : [tones];
	const fifthMayGo = instrument.fifthOptional || tones.length > 3;
	if (fifthMayGo && withoutFifth.length < tones.length) choices.push(withoutFifth);
	if (withoutFifth.length > strings) choices.push(withoutFifth.filter((pc) => pc !== chord.root));
	return choices.filter((needed) => needed.length <= strings);
}

/**
 * Every shape whose sounding strings all play notes of the chord.
 * @param {Instrument} instrument
 * @param {number[]} tones
 * @param {Shape} strings
 * @returns {Generator<Shape>}
 */
function* allShapes(instrument, tones, strings = []) {
	if (strings.length === instrument.strings.length) {
		yield strings;
		return;
	}
	const open = instrument.strings[strings.length];
	if (!instrument.everyString) yield* allShapes(instrument, tones, [...strings, null]);
	for (let fret = instrument.lowestFret; fret <= instrument.highestFret; fret++) {
		if (tones.includes((open + fret) % 12)) yield* allShapes(instrument, tones, [...strings, fret]);
	}
}

/**
 * @param {Instrument} instrument
 * @param {Shape} shape
 * @param {number} root
 * @param {number[]} needed
 */
function holds(instrument, shape, root, needed) {
	const lowest = shape.findIndex((fret) => fret !== null);
	if (lowest === -1) return false;
	const sounding = shape.slice(lowest);
	if (sounding.includes(null) || sounding.length < instrument.fewestStrings) return false;
	const pitches = sounding.map((fret, i) => (instrument.strings[lowest + i] + Number(fret)) % 12);
	if (instrument.rootInBass && pitches[0] !== root) return false;
	if (!needed.every((pc) => pitches.includes(pc))) return false;
	return fitsOneHand(/** @type {number[]} */ (sounding), instrument.span);
}

/**
 * Fretted notes within the hand's span and no more than four fingers,
 * counting a barre across the lowest fret as one (with no open string under it).
 * @param {number[]} frets
 * @param {number} span
 */
function fitsOneHand(frets, span) {
	const fretted = frets.filter((fret) => fret > 0);
	if (fretted.length === 0) return true;
	const lowest = Math.min(...fretted);
	if (Math.max(...fretted) - lowest > span) return false;
	if (fretted.length <= FINGERS) return true;
	const barre = !frets.includes(0);
	return barre && fretted.filter((fret) => fret > lowest).length <= FINGERS - 1;
}
