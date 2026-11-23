/**
 * Every kind of chord the app knows, as plain data: its suffix in a chord
 * name, its notes as degrees above the root, and whether it's everyday
 * bluegrass or a jazzier colour. A new kind of chord is one entry; the
 * guitar's shapes (instruments/guitarVoicing.js), the chord suggestions
 * (chordsThatFit.js) and the chord scales (chordScaleFor.js) all read it.
 *
 * `avoid`: a note that clashes with the chord even as a tension (a sus
 * chord's 3rd, which fights its 4th).
 */
import { readDegrees } from './degreeLabels.js';

/**
 * @typedef {{
 *   suffix: string, aliases: string[], name: string, tones: string,
 *   bluegrass: boolean, avoid?: string
 * }} ChordType
 */

export const CHORD_TYPES = Object.freeze([
	{ suffix: '', aliases: [], name: 'major', tones: '1 3 5', bluegrass: true },
	{ suffix: 'm', aliases: ['min', '-'], name: 'minor', tones: '1 b3 5', bluegrass: true },
	{ suffix: '7', aliases: [], name: 'seventh', tones: '1 3 5 b7', bluegrass: true },
	{ suffix: 'dim', aliases: ['°'], name: 'diminished', tones: '1 b3 b5', bluegrass: false },
	{ suffix: 'aug', aliases: ['+'], name: 'augmented', tones: '1 3 #5', bluegrass: false },
	{ suffix: '6', aliases: [], name: 'sixth', tones: '1 3 5 6', bluegrass: false },
	{ suffix: 'm6', aliases: ['-6'], name: 'minor sixth', tones: '1 b3 5 6', bluegrass: false },
	{
		suffix: 'maj7',
		aliases: ['M7', 'Δ'],
		name: 'major seventh',
		tones: '1 3 5 7',
		bluegrass: false
	},
	{
		suffix: 'm7',
		aliases: ['-7', 'min7'],
		name: 'minor seventh',
		tones: '1 b3 5 b7',
		bluegrass: false
	},
	{
		suffix: 'mmaj7',
		aliases: ['m(maj7)', '-maj7'],
		name: 'minor major seventh',
		tones: '1 b3 5 7',
		bluegrass: false
	},
	{
		suffix: 'm7b5',
		aliases: ['ø', '-7b5'],
		name: 'half-diminished',
		tones: '1 b3 b5 b7',
		bluegrass: false
	},
	{
		suffix: 'dim7',
		aliases: ['°7'],
		name: 'diminished seventh',
		tones: '1 b3 b5 bb7',
		bluegrass: false
	},
	{
		suffix: 'sus4',
		aliases: ['sus'],
		name: 'suspended fourth',
		tones: '1 4 5',
		bluegrass: false,
		avoid: '3'
	},
	{ suffix: 'sus2', aliases: [], name: 'suspended second', tones: '1 2 5', bluegrass: false },
	{
		suffix: '7sus4',
		aliases: ['7sus'],
		name: 'seventh, suspended fourth',
		tones: '1 4 5 b7',
		bluegrass: false,
		avoid: '3'
	},
	{ suffix: 'add9', aliases: [], name: 'added ninth', tones: '1 3 5 9', bluegrass: false },
	{ suffix: '9', aliases: [], name: 'ninth', tones: '1 3 5 b7 9', bluegrass: false },
	{ suffix: 'm9', aliases: ['-9'], name: 'minor ninth', tones: '1 b3 5 b7 9', bluegrass: false }
]);

/**
 * The chord's notes as semitones above its root.
 * @param {ChordType} type
 */
export function toneSemitones(type) {
	return readDegrees(type.tones).map((degree) => degree.semitones);
}

/**
 * The type a chord name's suffix names, or null.
 * @param {string} suffix what follows the root, e.g. "m7", "°7", "" (a variant after ":" left off)
 */
export function chordTypeOf(suffix) {
	return (
		CHORD_TYPES.find((type) => type.suffix === suffix || type.aliases.includes(suffix)) ?? null
	);
}

const NOTE_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * A chord name's root pitch class and type, or null for a name the theory
 * doesn't know.
 * @param {string} name without a slash bass or variant, e.g. "F#m7"
 * @returns {{ root: number, type: ChordType } | null}
 */
export function readChordName(name) {
	const match = name.match(/^([A-G])([#b]?)(.*)$/);
	const type = match && chordTypeOf(match[3]);
	if (!match || !type) return null;
	const sign = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
	return { root: (NOTE_PITCH[/** @type {keyof NOTE_PITCH} */ (match[1])] + sign + 12) % 12, type };
}

/**
 * The pitch classes a chord sounds.
 * @param {{ root: number, type: ChordType }} chord
 */
export function chordPitchClasses(chord) {
	return toneSemitones(chord.type).map((tone) => (chord.root + tone) % 12);
}
