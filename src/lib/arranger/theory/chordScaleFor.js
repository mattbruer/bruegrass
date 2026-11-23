/**
 * A chord's scale in its place in a song, the way the Berklee text picks it
 * (docs/theory/chord-scales.md): from what the chord does, which needs the
 * key and the chord it goes to. Every note of the octave above the chord's
 * root gets a role: a chord tone, a tension, a scale approach (avoid), or
 * not in the scale at all.
 *
 * Works in pitch classes, so it holds in every key: the book's rows are
 * counted from the tonic (their numeral) and from the chord's root (their notes).
 *
 * A row written for a seventh chord serves the triad on the same root too:
 * the 7th the triad leaves out becomes a tension, as the book's own I row
 * shows (C: T7). A sus chord's 3rd becomes an approach note.
 */
import { readDegrees } from './degreeLabels.js';
import { toneSemitones } from './chordTypes.js';
import {
	AUXILIARY_DIMINISHED,
	BORROWED_IN_MAJOR,
	CHROMATIC_DIMINISHED,
	PASSING_DIMINISHED,
	DOMINANT_TO_MAJOR,
	DOMINANT_TO_MINOR,
	KEY_CHORDS,
	SUB_DOMINANT,
	UNRESOLVED_DOMINANT
} from './chordScaleBook.js';

/**
 * @typedef {import('./chordTypes.js').ChordType} ChordType
 * @typedef {import('./degreeLabels.js').Role} Role
 * @typedef {{ tonic: number, minor: boolean }} PlainKey tonic: pitch class
 * @typedef {{ root: number, type: ChordType }} PlainChord root: pitch class
 * @typedef {{ scale: string, does: string, page: number | null, roles: Map<number, Role> }} ChordScale
 *   does: what the chord does, as a numeral ("V7/V", "subV7/II", "IV", "borrowed bVII");
 *   roles: by semitones above the root (0–11); missing: not in the scale
 */

const NUMERALS = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
/** A diminished chord is named for the note it raises: C♯°7, not D♭°7 */
const SHARP_NUMERALS = { 1: '#I', 3: '#II', 6: '#IV', 8: '#V' };
const KEY_SCALES = {
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10, 11] // natural minor, with harmonic minor's leading tone for V
};
const UP_A_FOURTH = 5; // a root falling a fifth lands a fourth up
const DOWN_A_HALF_STEP = 11;
const UP_A_HALF_STEP = 1;

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {PlainChord | null} next the chord it goes to
 * @returns {ChordScale}
 */
export function chordScaleFor(key, chord, next) {
	const tones = toneSemitones(chord.type);
	const found =
		diminishedScale(key, chord, tones, next) ??
		dominantScale(key, chord, tones, next) ??
		keyChordScale(key, chord, tones) ??
		borrowedScale(key, chord, tones) ??
		unresolvedDominantScale(key, chord, tones);
	if (found) return found;
	return {
		scale: 'the key’s notes',
		does: numeral(key, chord.root),
		page: null,
		roles: fromTheKey(key, chord, tones)
	};
}

/* ---- What the chord does ---- */

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 * @param {PlainChord | null} next
 */
function diminishedScale(key, chord, tones, next) {
	if (!tones.includes(6) || !tones.includes(3) || tones.includes(10)) return null;
	const place =
		SHARP_NUMERALS[/** @type {1 | 3 | 6 | 8} */ (mod12(chord.root - key.tonic))] ??
		numeral(key, chord.root);
	if (next && interval(chord.root, next.root) === 0) {
		return fromRow(AUXILIARY_DIMINISHED, `${place}° (auxiliary)`, chord, tones);
	}
	const fromTonic = /** @type {1 | 3 | 6 | 8} */ (mod12(chord.root - key.tonic));
	const passing = next && interval(chord.root, next.root) === UP_A_HALF_STEP;
	const row = passing
		? PASSING_DIMINISHED[fromTonic]
		: CHROMATIC_DIMINISHED[/** @type {3} */ (fromTonic)];
	if (row && !key.minor)
		return fromRow(row, `${place}° (${passing ? 'passing' : 'chromatic'})`, chord, tones);
	return null;
}

/**
 * A dominant that resolves: down a fifth (V7 of the chord it goes to), or
 * down a half step (a tritone substitute). A major triad off the key that
 * falls a fifth is a dominant too (D → G in C is V/V).
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 * @param {PlainChord | null} next
 */
function dominantScale(key, chord, tones, next) {
	if (!next || !isDominantShaped(tones)) return null;
	const target = numeral(key, next.root);
	const seventh = tones.includes(10) ? '7' : '';
	const motion = interval(chord.root, next.root);
	if (motion === UP_A_FOURTH && (seventh || !inKey(key, chord, tones) || target === 'I')) {
		if (target === 'I') {
			const row = KEY_CHORDS[key.minor ? 'minor' : 'major'].find((each) => each.numeral === 'V');
			return row ? fromRow(row, `V${seventh}`, chord, tones) : null;
		}
		const toMinor = toneSemitones(next.type).includes(3);
		const row = !toMinor
			? DOMINANT_TO_MAJOR
			: target === 'II'
				? DOMINANT_TO_MINOR.II
				: DOMINANT_TO_MINOR.other;
		return fromRow(row, `V${seventh}/${target}`, chord, tones);
	}
	if (motion === DOWN_A_HALF_STEP && seventh) {
		return fromRow(SUB_DOMINANT, `subV7/${target}`, chord, tones);
	}
	return null;
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function keyChordScale(key, chord, tones) {
	if (!inKey(key, chord, tones)) return null;
	const rows = KEY_CHORDS[key.minor ? 'minor' : 'major'];
	const row = bestRow(rows, numeral(key, chord.root), chord, tones);
	return row && fromRow(row, numeral(key, chord.root), chord, tones);
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function borrowedScale(key, chord, tones) {
	const rows = key.minor ? KEY_CHORDS.major : BORROWED_IN_MAJOR;
	const row = bestRow(rows, numeral(key, chord.root), chord, tones);
	return row && fromRow(row, `${numeral(key, chord.root)}, borrowed`, chord, tones);
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function unresolvedDominantScale(key, chord, tones) {
	if (!isDominantShaped(tones)) return null;
	const place = numeral(key, chord.root);
	const row =
		place === 'I'
			? UNRESOLVED_DOMINANT.I
			: place === 'III'
				? UNRESOLVED_DOMINANT.III
				: UNRESOLVED_DOMINANT.other;
	return fromRow(row, `${place}${tones.includes(10) ? '7' : ''}`, chord, tones);
}

/* ---- Rows to roles ---- */

/**
 * The row for this numeral that has room for every one of the chord's
 * notes: the one written for this very chord first.
 * @param {import('./chordScaleBook.js').BookRow[]} rows
 * @param {string} place
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function bestRow(rows, place, chord, tones) {
	const candidates = rows.filter((row) => row.numeral === place && holds(row.notes, tones));
	return candidates.find((row) => row.type === chord.type.suffix) ?? candidates[0] ?? null;
}

/**
 * @param {string} notes
 * @param {number[]} tones
 */
function holds(notes, tones) {
	const scale = readDegrees(notes).map((degree) => degree.semitones);
	return tones.every((tone) => scale.includes(tone));
}

/**
 * The row's roles, with this chord's own notes as its chord tones.
 * @param {{ scale: string, notes: string, page: number }} row
 * @param {string} does
 * @param {PlainChord} chord
 * @param {number[]} tones
 * @returns {ChordScale}
 */
function fromRow(row, does, chord, tones) {
	const avoid = chord.type.avoid ? readDegrees(chord.type.avoid)[0].semitones : null;
	/** @type {Map<number, Role>} */
	const roles = new Map();
	for (const degree of readDegrees(row.notes)) {
		const role = tones.includes(degree.semitones)
			? 'tone'
			: degree.semitones === avoid
				? 'approach'
				: degree.role === 'tone'
					? 'tension'
					: degree.role;
		roles.set(degree.semitones, role);
	}
	for (const tone of tones) roles.set(tone, 'tone');
	return { scale: row.scale, does, page: row.page, roles };
}

/**
 * When no row fits: the key's notes with the chord's own swapped in. A note
 * a half step above a chord tone is an approach note (the avoid-note rule);
 * the rest are tensions.
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function fromTheKey(key, chord, tones) {
	/** @type {Map<number, Role>} */
	const roles = new Map(tones.map((tone) => [tone, 'tone']));
	for (const step of KEY_SCALES[key.minor ? 'minor' : 'major']) {
		const note = mod12(key.tonic + step - chord.root);
		if (roles.has(note) || tones.some((tone) => mod12(tone - note) === 1 && tone !== 0)) continue;
		const aboveATone = tones.some((tone) => mod12(note - tone) === 1);
		roles.set(note, aboveATone ? 'approach' : 'tension');
	}
	return roles;
}

/* ---- Small helpers ---- */

/** @param {number[]} tones a major 3rd and no minor 3rd: a chord that can act as a dominant */
function isDominantShaped(tones) {
	return tones.includes(4) && !tones.includes(3) && !tones.includes(11) && !tones.includes(8);
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function inKey(key, chord, tones) {
	const scale = KEY_SCALES[key.minor ? 'minor' : 'major'];
	return tones.every((tone) => scale.includes(mod12(chord.root + tone - key.tonic)));
}

/**
 * @param {PlainKey} key
 * @param {number} root
 */
export function numeral(key, root) {
	return NUMERALS[mod12(root - key.tonic)];
}

/**
 * @param {number} from
 * @param {number} to
 */
const interval = (from, to) => mod12(to - from);

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;
