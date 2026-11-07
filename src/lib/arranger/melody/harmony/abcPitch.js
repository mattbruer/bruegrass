/**
 * Between ABC pitches and notes as steps of the tune's key
 * (theory/musicInKey.js), so harmony notes are spelled the way a musician
 * would write them (G# over an E7, not Ab).
 */
import { majorKey, semitones, signatureAccidental, spell } from '../../theory/musicInKey.js';

const SHARP_MAJORS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const FLAT_MAJORS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
const ACCIDENTAL_TEXT = { '-2': '__', '-1': '_', 0: '=', 1: '^', 2: '^^' };
const MIDDLE_C = 60;

/**
 * @typedef {import('../../theory/musicInKey.js').Key} Key
 * @typedef {import('../../theory/musicInKey.js').Note} Note
 * @typedef {Map<number, number>} BarAccidentals accidental written in this bar, by staff position
 */

/**
 * The major key with the tune's key signature (K:Ador and K:Em are read as G),
 * which is all the spelling needs.
 * @param {{ accidentals?: { acc: string }[] }} signature tune.getKeySignature()
 * @returns {Key}
 */
export function tuneKey(signature) {
	const accidentals = signature.accidentals ?? [];
	const sharps = accidentals.filter((a) => a.acc === 'sharp').length;
	const flats = accidentals.filter((a) => a.acc === 'flat').length;
	return majorKey(sharps > 0 ? SHARP_MAJORS[sharps] : FLAT_MAJORS[flats]);
}

/**
 * A written note as a step of the key.
 * @param {Key} key
 * @param {number} staffPosition abcjs's diatonic pitch (C = 0 is middle C)
 * @param {number} midi the pitch it sounds at
 * @returns {Note}
 */
export function noteInKey(key, staffPosition, midi) {
	const step = staffPosition - key.letter;
	return { step, alt: midi - (MIDDLE_C + key.pc + semitones({ step, alt: 0 })) };
}

/**
 * The ABC for a note ("^F,", "_b", "c'"), with an accidental only where the
 * key signature and the bar so far don't already give it.
 * @param {Key} key
 * @param {Note} note
 * @param {BarAccidentals} bar updated with any accidental written
 */
export function abcPitch(key, note, bar) {
	const position = key.letter + note.step;
	const { letter, accidental } = spell(key, note);
	const given = bar.get(position) ?? signatureAccidental(key, letter);
	// Safer than relying on how a reader carries accidentals across octaves
	const otherOctave = [...bar.keys()].some((p) => p !== position && (p - position) % 7 === 0);
	let prefix = '';
	if (accidental !== given || otherOctave) {
		prefix = ACCIDENTAL_TEXT[/** @type {-2|-1|0|1|2} */ (accidental)] ?? '';
		bar.set(position, accidental);
	}
	return prefix + letterInOctave(letter, Math.floor(position / 7));
}

/**
 * @param {string} letter
 * @param {number} octave 0 = the octave from middle C
 */
function letterInOctave(letter, octave) {
	if (octave <= 0) return letter + ','.repeat(-octave);
	return letter.toLowerCase() + "'".repeat(octave - 1);
}
