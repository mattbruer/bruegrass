/**
 * Chord-scale theory: every chord has a scale to play over it. A chord that
 * belongs to the key uses the key's own notes (its mode: G in G is Ionian,
 * Am is Dorian, C is Lydian). A chord from outside the key gets the scale
 * jazz players reach for, below. Each scale also has its bebop passing note
 * and the tensions (9, 11, 13) that sound good on a beat.
 */
import { chordTones, notesAbove, semitones } from './musicInKey.js';

/* Semitones above the root, one note per letter */
const MODES = {
	lydian: [0, 2, 4, 6, 7, 9, 11], // major chords borrowed from outside the key: bVII, bVI
	dorian: [0, 2, 3, 5, 7, 9, 10], // borrowed minor chords: iv
	mixolydian: [0, 2, 4, 5, 7, 9, 10], // dominants leading to a major chord: II7, I7
	phrygianDominant: [0, 1, 4, 5, 7, 8, 10], // dominants leading to a minor chord: III7, VI7, VII7 (b9, b13)
	lydianDominant: [0, 2, 4, 6, 7, 9, 10] // tritone subs: bII7, bVI7 (#11)
};

/* Diminished chords: whole step, half step. Eight notes, so A and A# share a letter */
const WHOLE_HALF = [
	[0, 0],
	[1, 2],
	[2, 3],
	[3, 5],
	[4, 6],
	[5, 8],
	[5, 9],
	[6, 11]
];

/* The bebop scales' extra note, [letters, semitones] above the root: it lets a
   running line keep chord tones on the beats (major #5, minor 3, dominant 7) */
const BEBOP_NOTE = { '': [4, 8], m: [2, 4], 7: [6, 11], dim: null };

/* Root steps whose dominant 7th leads to a minor chord: III7 → vi, VI7 → ii, VII7 → iii */
const LEADS_TO_MINOR = [2, 5, 6];

/**
 * @typedef {import('./musicInKey.js').Note} Note
 * @typedef {import('./musicInKey.js').Chord} Chord
 * @typedef {{ scale: Note[], bebop: Note[], tones: Note[], tensions: Note[] }} ChordScale
 *   one octave up from the root: the scale, the scale with its bebop note,
 *   the chord tones, and the tensions that aren't avoid notes
 */

/**
 * @param {Chord} chord
 * @returns {ChordScale}
 */
export function chordScale(chord) {
	const tones = chordTones(chord);
	const scale = notesAbove(chord.root, scaleIntervals(chord, tones));
	const bebopNote = BEBOP_NOTE[chord.quality];
	const bebop = bebopNote ? [...scale, ...notesAbove(chord.root, [bebopNote])] : scale;
	return { scale, bebop: bySemitones(bebop), tones, tensions: tensions(chord, scale, tones) };
}

/**
 * The scale as [letters, semitones] above the root.
 * @param {Chord} chord
 * @param {Note[]} tones
 * @returns {[number, number][]}
 */
function scaleIntervals(chord, tones) {
	if (tones.every((tone) => tone.alt === 0) && chord.root.alt === 0) {
		const root = semitones(chord.root);
		return [0, 1, 2, 3, 4, 5, 6].map((letters) => [
			letters,
			semitones({ step: chord.root.step + letters, alt: 0 }) - root
		]);
	}
	if (chord.quality === 'dim') return /** @type {[number, number][]} */ (WHOLE_HALF);
	return MODES[modeName(chord)].map((interval, letters) => [letters, interval]);
}

/**
 * The mode for a chord from outside the key.
 * @param {Chord} chord
 * @returns {keyof MODES}
 */
function modeName({ root, quality }) {
	if (quality === 'm') return 'dorian';
	if (quality === '') return 'lydian';
	if (root.alt < 0) return 'lydianDominant';
	return LEADS_TO_MINOR.includes(root.step) && root.alt === 0 ? 'phrygianDominant' : 'mixolydian';
}

/**
 * Scale notes that aren't chord tones, without the avoid notes: a note a
 * half step above a chord tone clashes with it (the 11th over a major 3rd).
 * On a dominant the b9 and b13 (above the root and fifth) are allowed:
 * that bite is the point.
 * @param {Chord} chord
 * @param {Note[]} scale
 * @param {Note[]} tones
 */
function tensions(chord, scale, tones) {
	const toneClasses = tones.map((tone) => mod12(semitones(tone)));
	const [root, , fifth] = toneClasses;
	return scale.filter((note) => {
		const pc = mod12(semitones(note));
		const below = mod12(pc - 1);
		if (toneClasses.includes(pc)) return false;
		if (!toneClasses.includes(below)) return true;
		return chord.quality === '7' && (below === root || below === fifth);
	});
}

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;

/** @param {Note[]} notes */
const bySemitones = (notes) => [...notes].sort((a, b) => semitones(a) - semitones(b));
