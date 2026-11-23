/**
 * The chord-scale tables from Lowell & Pullig, Arranging for Large Jazz
 * Ensemble (Berklee Press), as data: docs/theory/chord-scales.md has them
 * in words, with page numbers. The book writes every example in C; a row's
 * numeral is its root counted from the key's tonic, and its notes are
 * counted from the chord's own root, so a row holds in every key.
 *
 * notes: 1 3 5… chord tones; T tensions; S scale approach (avoid) notes.
 * type: the chord the row is written for (chordTypes.js suffix).
 */

/**
 * @typedef {{ numeral: string, type: string, scale: string, notes: string, page: number }} BookRow
 */

/** @type {Record<'major' | 'minor', BookRow[]>} the key's own chords (pp. 16, 17) */
export const KEY_CHORDS = {
	major: [
		{ numeral: 'I', type: '', scale: 'Ionian', notes: '1 T9 3 S4 5 T13 T7', page: 16 },
		{ numeral: 'I', type: '6', scale: 'Ionian', notes: '1 T9 3 S4 5 6 T7', page: 16 },
		{ numeral: 'I', type: 'maj7', scale: 'Ionian', notes: '1 T9 3 S4 5 T13 7', page: 16 },
		{ numeral: 'II', type: 'm7', scale: 'Dorian', notes: '1 T9 b3 T11 5 S6 b7', page: 16 },
		{ numeral: 'III', type: 'm7', scale: 'Phrygian', notes: '1 Sb2 b3 T11 5 Sb6 b7', page: 16 },
		{ numeral: 'IV', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 16 },
		{ numeral: 'V', type: '7', scale: 'Mixolydian', notes: '1 T9 3 S4 5 T13 b7', page: 16 },
		{ numeral: 'VI', type: 'm7', scale: 'Aeolian', notes: '1 T9 b3 T11 5 Sb6 b7', page: 16 },
		{ numeral: 'VII', type: 'm7b5', scale: 'Locrian', notes: '1 Sb2 b3 T11 b5 Tb13 b7', page: 16 }
	],
	minor: [
		{ numeral: 'I', type: 'm7', scale: 'natural minor', notes: '1 T9 b3 T11 5 Sb6 b7', page: 17 },
		{ numeral: 'I', type: 'm6', scale: 'melodic minor', notes: '1 T9 b3 T11 5 6 T7', page: 17 },
		{
			numeral: 'I',
			type: 'mmaj7',
			scale: 'harmonic minor',
			notes: '1 T9 b3 T11 5 Sb6 7',
			page: 17
		},
		{ numeral: 'II', type: 'm7b5', scale: 'Locrian', notes: '1 Sb2 b3 T11 b5 Tb13 b7', page: 17 },
		{ numeral: 'bIII', type: 'maj7', scale: 'Ionian', notes: '1 T9 3 S4 5 T13 7', page: 17 },
		{ numeral: 'IV', type: 'm7', scale: 'Dorian', notes: '1 T9 b3 T11 5 S6 b7', page: 17 },
		{
			numeral: 'V',
			type: '7',
			scale: 'Mixolydian ♭9 ♭13',
			notes: '1 Tb9 3 S4 5 Tb13 b7',
			page: 17
		},
		{ numeral: 'bVI', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 17 },
		{ numeral: 'bVII', type: '7', scale: 'Mixolydian', notes: '1 T9 3 S4 5 T13 b7', page: 17 }
	]
};

/** Chords borrowed into a major key from its parallel modes (p. 18). */
export const BORROWED_IN_MAJOR = [
	{ numeral: 'I', type: 'm7', scale: 'Dorian', notes: '1 T9 b3 T11 5 S6 b7', page: 18 },
	{ numeral: 'bII', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 18 },
	{ numeral: 'bIII', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 18 },
	{ numeral: 'IV', type: 'm6', scale: 'melodic minor', notes: '1 T9 b3 T11 5 6 T7', page: 18 },
	{ numeral: 'IV', type: 'm7', scale: 'Dorian', notes: '1 T9 b3 T11 5 S6 b7', page: 18 },
	{ numeral: 'V', type: 'm7', scale: 'Dorian', notes: '1 T9 b3 T11 5 S6 b7', page: 18 },
	{ numeral: 'bVI', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 18 },
	{ numeral: 'VI', type: 'm7b5', scale: 'Locrian ♮9', notes: '1 T9 b3 T11 b5 Tb13 b7', page: 18 },
	{ numeral: 'bVII', type: 'maj7', scale: 'Lydian', notes: '1 T9 3 T#11 5 T13 7', page: 18 },
	{ numeral: 'bVII', type: '7', scale: 'Lydian ♭7', notes: '1 T9 3 T#11 5 T13 b7', page: 18 }
];

/**
 * Secondary dominants, by the key chord they resolve to (p. 20): Mixolydian
 * when the target has a major 3rd, a ♭13 scale when it has a minor 3rd.
 */
export const DOMINANT_TO_MAJOR = {
	scale: 'Mixolydian',
	notes: '1 T9 3 S4 5 T13 b7',
	page: 20
};
export const DOMINANT_TO_MINOR = {
	II: { scale: 'Mixolydian ♭13', notes: '1 T9 3 S4 5 Tb13 b7', page: 20 },
	other: { scale: 'Mixolydian ♭9 ♭13', notes: '1 Tb9 T#9 3 S4 5 Tb13 b7', page: 20 }
};

/** Every dominant resolving down a half step: a tritone substitute (pp. 20–21). */
export const SUB_DOMINANT = { scale: 'Lydian ♭7', notes: '1 T9 3 T#11 5 T13 b7', page: 20 };

/**
 * Dominants that resolve neither down a fifth nor a half step: colour
 * chords, mostly blues (pp. 21–22). Lydian ♭7 unless listed here.
 */
export const UNRESOLVED_DOMINANT = {
	I: { scale: 'Mixolydian', notes: '1 T9 3 S4 5 T13 b7', page: 21 },
	III: { scale: 'Mixolydian ♭13', notes: '1 T9 3 S4 5 Tb13 b7', page: 22 },
	other: { scale: 'Lydian ♭7', notes: '1 T9 3 T#11 5 T13 b7', page: 21 }
};

/** The I7 of the blues: its ♯9 is the blue ♭3 (p. 21). */
export const BLUES_DOMINANT = { scale: 'blues', notes: '1 T#9 3 Tb5 5 T13 b7', page: 21 };

/** An auxiliary diminished chord (on the root of the chord it decorates): whole-half (p. 23). */
export const AUXILIARY_DIMINISHED = {
	scale: 'whole-half diminished',
	notes: '1 T9 b3 T11 b5 Tb13 bb7 T7',
	page: 23
};

/**
 * Passing diminished chords, rising a half step to the next chord, by their
 * root's semitones above the tonic (p. 23, major key): the key's notes
 * around the chord's own.
 */
export const PASSING_DIMINISHED = {
	1: { scale: 'passing diminished (♯I°7)', notes: '1 Sb2 b3 Sb4 b5 Tb13 bb7 Tb7', page: 23 },
	3: { scale: 'passing diminished (♯II°7)', notes: '1 Sb2 b3 Sb4 b5 Tb13 bb7 Tb7', page: 23 },
	6: { scale: 'passing diminished (♯IV°7)', notes: '1 Sb2 b3 T11 b5 Tb13 bb7 Tb7', page: 23 },
	8: { scale: 'passing diminished (♯V°7)', notes: '1 Sb2 b3 Sb4 b5 Tb13 bb7 Tb7', page: 23 }
};

/** ♭III°7 going on to II-7 (p. 23). */
export const CHROMATIC_DIMINISHED = {
	3: { scale: 'chromatic diminished (♭III°7)', notes: '1 T9 b3 S3 b5 Tb13 bb7 T7', page: 23 }
};
