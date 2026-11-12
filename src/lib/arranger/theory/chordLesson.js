/**
 * A short theory lesson on one chord, for a player who just wants to know
 * what to play: the note that gives the chord its sound, and the scale to
 * improvise on, in plain words first ("the G major scale with C♯ instead
 * of C") and then by name (A Mixolydian).
 */
import { keyName, noteName, notePc, mod12 } from '../chart/key.js';
import { readChord } from './analyzeProgression.js';
import { chordTones, scaleOfMode, scaleToPlay } from './scaleToPlay.js';
import { OWN_MODES } from './modes.js';

/**
 * @typedef {import('../chart/key.js').Note} Note
 * @typedef {import('../chart/key.js').Key} Key
 * @typedef {{
 *   chordNotes: string[],
 *   leanOn: string,
 *   scale: { name: string | null, notes: string[], plain: string },
 *   pitches: number[]
 * }} ChordLesson
 *   pitches: the scale as MIDI notes from its root up to the octave, around middle C
 *   (written, before any capo or key change)
 */

/* What to call the note a few letters above the root */
const INTERVAL_NAMES = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'];
/* The order a chord's notes are worth leaning on: its 3rd says the most, then its 7th */
const LEAN_ON_ORDER = [1, 3, 2, 0];
/* The scale is played from a root between these, so it sits in the middle of a melody */
const LOWEST_ROOT = 64;

/**
 * @param {string} name the chord as written
 * @param {import('./analyzeProgression.js').Reading} reading what it does
 * @param {Key} key
 * @returns {ChordLesson | null} null for anything that isn't a chord
 */
export function chordLesson(name, reading, key) {
	const chord = readChord(name, key);
	if (!chord) return null;
	const home = homeScale(key);
	const tones = chordTones(chord);
	const scale = scaleToPlay(chord, reading.kind, key);
	const isEightNotes = scale.notes.length === 8;
	return {
		chordNotes: tones.map(written),
		leanOn: leanOn(name, tones, home, key),
		scale: {
			name: scale.name && `${written(chord.root)} ${scale.name}`,
			notes: scale.notes.map(isEightNotes ? plainlyWritten : written),
			plain: isEightNotes
				? `Whole step, half step, all the way up from ${written(chord.root)}: a scale made for diminished chords.`
				: inPlainWords(scale.notes, chord, key)
		},
		pitches: pitchesFrom(chord.root, scale.semitones)
	};
}

/** @param {Key} key */
function homeScale(key) {
	return scaleOfMode(OWN_MODES[key.minor ? 'minor' : 'major'][0], key);
}

/**
 * A major or minor scale a player already knows, to describe another by.
 * @param {Key} key on its tonic: the key's own, or one on the chord's root
 */
function knownScale(key) {
	return {
		notes: homeScale(key),
		name: `the ${written(key.tonic)} ${key.minor ? 'minor' : 'major'} scale`
	};
}

/**
 * The note that gives the chord its sound: the first of its notes outside
 * the key (3rd first, then 7th), and where it wants to go. A chord made
 * only of key notes gets its 3rd instead.
 * @param {string} name
 * @param {Note[]} tones
 * @param {Note[]} home
 * @param {Key} key
 */
function leanOn(name, tones, home, key) {
	const outside = LEAN_ON_ORDER.map((i) => tones[i]).find(
		(tone) => tone && !sameNote(tone, keyNoteOn(tone.letter, home))
	);
	if (!outside) {
		const [root, colour] = tones;
		const which = INTERVAL_NAMES[(colour.letter - root.letter + 7) % 7];
		return `Every note of ${name} is in the key. Land on ${written(colour)}, its ${which}, on the beat: that's the note that makes it sound like ${name} and not just the key.`;
	}
	const intro = `${written(outside)} isn't in the key of ${keyName(key)}: it's the note that gives ${name} its sound. Lean on it`;
	const keyNote = keyNoteOn(outside.letter, home);
	if (outside.accidental > keyNote.accidental) {
		const above = keyNoteOn((outside.letter + 1) % 7, home);
		if (halfStepApart(outside, above)) return `${intro}, and let it rise to ${written(above)}.`;
	} else {
		const below = keyNoteOn((outside.letter + 6) % 7, home);
		if (halfStepApart(below, outside)) return `${intro}, and let it fall to ${written(below)}.`;
	}
	return `${intro}.`;
}

/**
 * "The G major scale, with C♯ instead of C": the scale described from the
 * key's own, or from the chord's own major or minor scale when that takes
 * fewer changes (D♭7 in G: the D♭ major scale with G and C♭).
 * @param {Note[]} notes
 * @param {import('./analyzeProgression.js').Chord} chord
 * @param {Key} key
 */
function inPlainWords(notes, chord, key) {
	const chordIsMinor = ['minor', 'halfDim'].includes(chord.family);
	const home = knownScale(key);
	const own = knownScale({ tonic: chord.root, minor: chordIsMinor });
	const changesFrom = (/** @type {Note[]} */ known) =>
		notes.filter((note) => !sameNote(note, keyNoteOn(note.letter, known)));
	const fromOwn = changesFrom(own.notes).length < changesFrom(home.notes).length;
	const known = fromOwn ? own : home;
	const changed = changesFrom(known.notes);
	if (changed.length === 0) {
		return fromOwn ? `Just ${known.name}.` : `Every note of ${known.name} fits.`;
	}
	const instead = changed.map((note) => written(keyNoteOn(note.letter, known.notes)));
	return `${capitalised(known.name)}, with ${list(changed.map(written))} instead of ${list(instead)}.`;
}

/**
 * @param {Note} root
 * @param {number[]} semitones above the root
 */
function pitchesFrom(root, semitones) {
	const rootPitch = LOWEST_ROOT + mod12(notePc(root) - LOWEST_ROOT);
	return [...semitones.map((step) => rootPitch + step), rootPitch + 12];
}

/**
 * @param {number} letter
 * @param {Note[]} scale
 */
function keyNoteOn(letter, scale) {
	return /** @type {Note} */ (scale.find((note) => note.letter === letter));
}

/** @param {Note} a @param {Note} b */
function sameNote(a, b) {
	return a.letter === b.letter && a.accidental === b.accidental;
}

/** @param {Note} lower @param {Note} upper */
function halfStepApart(lower, upper) {
	return mod12(notePc(upper) - notePc(lower)) === 1;
}

/**
 * A note by its plainest name (F, not E♯; G, not F♯♯), for the
 * diminished scale's eight notes, where the letters can't all differ.
 * @param {Note} note
 */
function plainlyWritten(note) {
	const pc = notePc(note);
	const natural = [0, 2, 4, 5, 7, 9, 11].indexOf(pc);
	if (natural >= 0) return written({ letter: natural, accidental: 0 });
	const sharpOf = [0, 2, 4, 5, 7, 9, 11].indexOf(pc - 1);
	const flatOf = [0, 2, 4, 5, 7, 9, 11].indexOf(pc + 1);
	return note.accidental < 0
		? written({ letter: flatOf, accidental: -1 })
		: written({ letter: sharpOf, accidental: 1 });
}

/** A note as a musician writes it: C♯, B♭ */
function written(/** @type {Note} */ note) {
	const name = noteName(note);
	return name[0] + name.slice(1).replaceAll('#', '♯').replaceAll('b', '♭');
}

/** @param {string[]} items "A♭, B♭ and E♭" */
function list(items) {
	return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** @param {string} text */
function capitalised(text) {
	return text[0].toUpperCase() + text.slice(1);
}
