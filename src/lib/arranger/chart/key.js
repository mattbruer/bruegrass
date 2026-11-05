/**
 * Keys, transposition and chord display.
 *
 * Chords are spelled by scale degree, not just by pitch: transposing keeps
 * each chord on the same letter step from the tonic, so G–C–D in G becomes
 * Bb–Eb–F in Bb (never A#–D#–F), and an F (bVII) in G becomes G in A.
 *
 * The song's key is taken from its first chord (bluegrass songs almost
 * always start on the I chord). A minor first chord makes it a minor key.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Conventional spelling of each key (the one with fewer accidentals). */
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/** @typedef {{ letter: number, accidental: number }} Note letter index into LETTERS, accidental in semitones */
/** @typedef {{ tonic: Note, minor: boolean }} Key */
/** @typedef {'shapes' | 'concert' | 'roman' | 'nashville'} ChordDisplay */

/** The ways chords can be shown, in the order the Chord display buttons offer them. */
export const CHORD_DISPLAYS = /** @type {const} */ ([
	{ id: 'shapes', name: 'Guitar shapes' },
	{ id: 'concert', name: 'Concert' },
	{ id: 'roman', name: 'Roman' },
	{ id: 'nashville', name: 'Nashville' }
]);

/** @param {number} n */
export function mod12(n) {
	return ((n % 12) + 12) % 12;
}

/** @param {string} text e.g. "Bb", "F#" */
function parseNote(text) {
	const letter = LETTERS.indexOf(text[0]);
	let accidental = 0;
	for (const char of text.slice(1)) accidental += char === '#' ? 1 : -1;
	return { letter, accidental };
}

/** @param {Note} note */
function notePc(note) {
	return mod12(NATURAL[note.letter] + note.accidental);
}

/** @param {Note} note */
function noteName(note) {
	const sign = note.accidental > 0 ? '#' : 'b';
	return LETTERS[note.letter] + sign.repeat(Math.abs(note.accidental));
}

/**
 * Split a chord name into root, quality/extension and optional bass note.
 * @param {string} name e.g. "G", "F#m7", "Bb/D"
 */
function parseChord(name) {
	const match = name.match(/^([A-G][#b]*)([^/]*)(?:\/([A-G][#b]*))?$/);
	if (!match) return null;
	return {
		root: parseNote(match[1]),
		rest: match[2],
		bass: match[3] ? parseNote(match[3]) : null
	};
}

/** @param {string} rest */
function isMinor(rest) {
	return /^(m(?!aj)|min)/.test(rest);
}

/**
 * The song's key, from its first chord.
 * @param {{ measures: string[][] }[]} sections
 * @returns {Key | null}
 */
export function songKey(sections) {
	const first = sections.flatMap((section) => section.measures.flat()).find(Boolean);
	const chord = first ? parseChord(first) : null;
	return chord ? { tonic: chord.root, minor: isMinor(chord.rest) } : null;
}

/**
 * Display name of the key a number of semitones from this one.
 * @param {Key} key
 * @param {number} shift semitones
 */
export function keyName(key, shift = 0) {
	const pc = mod12(notePc(key.tonic) + shift);
	return key.minor ? `${MINOR_KEYS[pc]}m` : MAJOR_KEYS[pc];
}

/**
 * Move a note into a new key, keeping its letter step from the tonic.
 * @param {Note} note
 * @param {Note} from old tonic
 * @param {Note} to new tonic
 * @param {number} shift semitones
 * @returns {Note}
 */
function transposeNote(note, from, to, shift) {
	const steps = (note.letter - from.letter + 7) % 7;
	const letter = (to.letter + steps) % 7;
	const target = mod12(notePc(note) + shift);
	const accidental = mod12(target - NATURAL[letter] + 6) - 6;
	// Avoid double sharps/flats: fall back to the plainest spelling
	if (Math.abs(accidental) > 1) return parseNote(MAJOR_KEYS[target]);
	return { letter, accidental };
}

/**
 * A note as a scale degree of the key: accidental prefix and degree index.
 * @param {Note} note
 * @param {Note} tonic
 */
function degree(note, tonic) {
	const steps = (note.letter - tonic.letter + 7) % 7;
	const offset = mod12(notePc(note) - notePc(tonic) - MAJOR_SCALE[steps] + 6) - 6;
	const prefix = (offset > 0 ? '#' : 'b').repeat(Math.abs(offset));
	return { steps, prefix };
}

/**
 * How to show a chord.
 * - shapes: as written (the guitar's shapes, before any capo)
 * - concert: the sounding chord, after capo and transposition
 * - roman / nashville: its function in the key (the same in every key)
 *
 * @param {string} name chord as written
 * @param {{ key: Key | null, shift: number, mode: ChordDisplay }} options
 *   shift = capo + transposition, in semitones
 */
export function chordLabel(name, { key, shift, mode }) {
	const chord = parseChord(name);
	if (!key || !chord || mode === 'shapes') return name;

	if (mode === 'concert') {
		if (mod12(shift) === 0) return name;
		const to = parseNote(keyName(key, shift));
		const root = noteName(transposeNote(chord.root, key.tonic, to, shift));
		const bass = chord.bass ? `/${noteName(transposeNote(chord.bass, key.tonic, to, shift))}` : '';
		return root + chord.rest + bass;
	}

	// Chord quality: lower case numerals for minor and diminished
	let rest = chord.rest;
	let quality = '';
	let lower = false;
	if (/^(dim|°)/.test(rest)) {
		rest = rest.replace(/^(dim|°)/, '');
		quality = '°';
		lower = true;
	} else if (/^(aug|\+)/.test(rest)) {
		rest = rest.replace(/^(aug|\+)/, '');
		quality = '+';
	} else if (isMinor(rest)) {
		rest = rest.replace(/^(min|m)/, '');
		quality = mode === 'nashville' ? 'm' : '';
		lower = true;
	}

	const { steps, prefix } = degree(chord.root, key.tonic);
	let bass = '';
	if (chord.bass) {
		const b = degree(chord.bass, key.tonic);
		bass = `/${b.prefix}${b.steps + 1}`;
	}

	if (mode === 'nashville') {
		// Extensions are superscript so 5 with a 7th (5⁷) can't be misread as "57"
		const extension = rest.replace(/\d/g, (digit) => SUPERSCRIPT[Number(digit)]);
		return `${prefix}${steps + 1}${quality}${extension}${bass}`;
	}
	const numeral = lower ? ROMAN[steps].toLowerCase() : ROMAN[steps];
	return `${prefix}${numeral}${quality}${rest}${bass}`;
}
