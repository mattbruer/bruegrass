/**
 * Notes and chords as steps of a major key, spelled the way a musician
 * would write them. A note is { step, alt }: step counts scale degrees from
 * the tonic (0 = tonic, 7 = tonic an octave up, -1 = the leading tone below),
 * alt raises or lowers it a semitone. Chords are written as Roman numerals:
 * "IV", "vi", "V7", "#iv°", "bII7", and slash chords like "I/3" (bass on the
 * key's 3rd degree: G/B in G).
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NUMERALS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

/* Semitones above the root for each chord quality, one per stacked third */
const CHORD_TONES = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], dim: [0, 3, 6] };

/* Letters that don't exist as chord roots on a chart: write the plain note instead */
const RESPELL = { 'E#': 'F', 'B#': 'C', Cb: 'B', Fb: 'E' };

/**
 * @typedef {{ step: number, alt: number }} Note
 * @typedef {{ root: Note, quality: '' | 'm' | '7' | 'dim', bass: Note | null }} Chord
 * @typedef {{ tonic: string, letter: number, pc: number }} Key
 */

/** @param {number} n */
const mod = (n, m = 12) => ((n % m) + m) % m;

/** @param {string} tonic a major key's tonic: "G", "D", "A", "C" */
export function majorKey(tonic) {
	const letter = LETTERS.indexOf(tonic);
	return { tonic, letter, pc: NATURAL_PC[letter] };
}

/**
 * Semitones above the tonic (tonic = 0).
 * @param {Note} note
 */
export function semitones({ step, alt }) {
	return MAJOR_SCALE[mod(step, 7)] + 12 * Math.floor(step / 7) + alt;
}

/**
 * The note's letter, its octave counted from the tonic's, and its real
 * accidental (-1 flat, 0 natural, 1 sharp).
 * @param {Key} key
 * @param {Note} note
 */
export function spell(key, note) {
	const letterIndex = key.letter + note.step;
	const letter = LETTERS[mod(letterIndex, 7)];
	const pc = mod(key.pc + semitones(note));
	const accidental = mod(pc - NATURAL_PC[mod(letterIndex, 7)] + 6) - 6;
	return { letter, octave: Math.floor(letterIndex / 7), accidental };
}

/**
 * The accidental the key signature gives a letter.
 * @param {Key} key
 * @param {string} letter
 */
export function signatureAccidental(key, letter) {
	const step = mod(LETTERS.indexOf(letter) - key.letter, 7);
	return spell(key, { step, alt: 0 }).accidental;
}

/**
 * @param {Key} key
 * @param {Note} note
 */
function noteName(key, note) {
	const { letter, accidental } = spell(key, note);
	const name = letter + (accidental > 0 ? '#' : accidental < 0 ? 'b' : '');
	return RESPELL[name] ?? name;
}

/**
 * A Roman numeral chord, e.g. "bII7", "#iv°", "I/3".
 * @param {string} numeral
 * @returns {Chord}
 */
export function readNumeral(numeral) {
	const match = numeral.match(/^([b#]?)([ivIV]+)(°|7)?(?:\/([b#]?)([1-7]))?$/);
	if (!match) throw new Error(`Can't read chord ${numeral}`);
	const [, accidental, roman, suffix, bassAccidental, bassDegree] = match;
	const lower = roman === roman.toLowerCase();
	const quality = suffix === '°' ? 'dim' : suffix === '7' ? '7' : lower ? 'm' : '';
	return {
		root: { step: NUMERALS.indexOf(roman.toLowerCase()), alt: altOf(accidental) },
		quality,
		bass: bassDegree ? { step: Number(bassDegree) - 1, alt: altOf(bassAccidental) } : null
	};
}

/** @param {string} accidental "", "b" or "#" */
const altOf = (accidental) => (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);

/**
 * The chord symbol in this key: "G", "Em", "Ab7", "G#dim", "G/F#".
 * @param {Key} key
 * @param {Chord} chord
 */
export function chordName(key, chord) {
	const bass = chord.bass ? `/${noteName(key, chord.bass)}` : '';
	return noteName(key, chord.root) + chord.quality + bass;
}

/**
 * The chord's notes as steps with alterations (root, third, fifth, seventh),
 * in the octave of its root.
 * @param {Chord} chord
 * @returns {Note[]}
 */
export function chordTones(chord) {
	return notesAbove(
		chord.root,
		CHORD_TONES[chord.quality].map((interval, i) => [2 * i, interval])
	);
}

/**
 * Notes above a root, each given as [letters up, semitones up], spelled
 * from the root's letter: from D, [2, 4] is F#, [2, 3] is F.
 * @param {Note} root
 * @param {[number, number][]} intervals
 * @returns {Note[]}
 */
export function notesAbove(root, intervals) {
	const rootSemitones = semitones(root);
	return intervals.map(([letters, interval]) => {
		const step = root.step + letters;
		return { step, alt: rootSemitones + interval - semitones({ step, alt: 0 }) };
	});
}

/**
 * The plainest way to write a pitch (semitones above the tonic) in this key:
 * fewest accidentals, no E#/B#/Cb/Fb, sharps going up and flats going down
 * when both read as plainly (G G# A, A Ab G).
 * @param {Key} key
 * @param {number} target
 * @param {number} direction 1 rising, -1 falling
 * @returns {Note}
 */
export function plainestNote(key, target, direction) {
	const near = Math.round((target * 7) / 12);
	/** @type {{ note: Note, cost: number }[]} */
	const options = [];
	for (let step = near - 2; step <= near + 2; step++) {
		const alt = target - semitones({ step, alt: 0 });
		if (Math.abs(alt) > 1) continue;
		const { letter, accidental } = spell(key, { step, alt });
		const awkward = RESPELL[letter + (accidental > 0 ? '#' : accidental < 0 ? 'b' : '')] ? 1 : 0;
		const against = accidental !== 0 && Math.sign(accidental) !== direction ? 0.5 : 0;
		options.push({ note: { step, alt }, cost: Math.abs(accidental) + awkward + against });
	}
	options.sort((a, b) => a.cost - b.cost);
	return options[0].note;
}
