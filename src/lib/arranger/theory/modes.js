/**
 * The modes chords are borrowed from, as plain data: each scale in
 * semitones above its tonic, one note per letter. A key's own chords come
 * from its own mode; modal interchange borrows from the others on the same
 * tonic (C Phrygian's Dbmaj7 in C major is bIImaj7).
 */

/** @typedef {keyof typeof MODES} ModeId */

export const MODES = {
	ionian: { name: 'major (Ionian)', scale: [0, 2, 4, 5, 7, 9, 11] },
	dorian: { name: 'Dorian', scale: [0, 2, 3, 5, 7, 9, 10] },
	phrygian: { name: 'Phrygian', scale: [0, 1, 3, 5, 7, 8, 10] },
	lydian: { name: 'Lydian', scale: [0, 2, 4, 6, 7, 9, 11] },
	mixolydian: { name: 'Mixolydian', scale: [0, 2, 4, 5, 7, 9, 10] },
	aeolian: { name: 'minor (Aeolian)', scale: [0, 2, 3, 5, 7, 8, 10] },
	locrian: { name: 'Locrian', scale: [0, 1, 3, 5, 6, 8, 10] },
	harmonicMinor: { name: 'harmonic minor', scale: [0, 2, 3, 5, 7, 8, 11] },
	melodicMinor: { name: 'melodic minor', scale: [0, 2, 3, 5, 7, 9, 11] }
};

/** The modes a key's own chords come from: a minor key has harmonic minor's V7 and VII°7 too */
export const OWN_MODES = /** @type {Record<'major' | 'minor', ModeId[]>} */ ({
	major: ['ionian'],
	minor: ['aeolian', 'harmonicMinor']
});

/**
 * Where a borrowed chord is looked for, first match wins: in a major key
 * the parallel minor first, as it's the most common; in a minor key Dorian
 * (its major IV), then major (a Picardy I); then the other modes.
 */
export const BORROWED_FROM = /** @type {Record<'major' | 'minor', ModeId[]>} */ ({
	major: [
		'aeolian',
		'dorian',
		'phrygian',
		'mixolydian',
		'lydian',
		'locrian',
		'harmonicMinor',
		'melodicMinor'
	],
	minor: ['dorian', 'ionian', 'phrygian', 'mixolydian', 'lydian', 'locrian', 'melodicMinor']
});
