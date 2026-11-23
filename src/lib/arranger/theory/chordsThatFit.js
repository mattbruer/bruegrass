/**
 * Every chord that fits the melody under one chord of the chart: each of
 * the twelve roots with each kind of chord (chordTypes.js) is tried in the
 * chord's place, with its scale picked by what it would do there
 * (chordScaleFor.js). It fits when every note heard against it (noteRoles.js:
 * all but approach notes) is
 * one of its chord tones or tensions, wherever in the song the chord plays,
 * and some note of the melody under it is one of its chord tones (or the
 * chord isn't heard in the tune at all).
 * A suspension fits when it steps into one of the chord's notes. Approach
 * notes only have to step into a target, which they do by being approach notes.
 *
 * Bluegrass adds blue notes: a ♭3 or ♭7 in the melody over a major I or IV
 * (the bent ♭3 over G) counts, like the book's blues I7 (p. 21). That's our
 * assumption, to be tried by ear.
 */
import { CHORD_TYPES, toneSemitones } from './chordTypes.js';
import { readDegrees } from './degreeLabels.js';
import { chordScaleFor, numeral } from './chordScaleFor.js';

/** Blue notes: semitones above the root, over a plain major or 7th chord on these chords of the key. */
const BLUE_NOTES = { numerals: ['I', 'IV'], types: ['', '7'], semitones: [3, 10] };
/** How much each kind of note counts towards a good fit (a chord tone is 1). */
const FIT_WEIGHT = { tone: 1, tension: 0.7, blue: 0.5, suspension: 0.5 };
/** A target on one of the bass's beats counts this much more. */
const BOOM_WEIGHT = 2;
/** Taken off the score for each chord note outside the key, and each beyond the triad. */
const OUTSIDE_KEY_PENALTY = 0.15;
const EXTENSION_PENALTY = 0.1;

/** What a tension is called, by semitones above the root. */
const TENSION_NAMES = {
	1: '♭9',
	2: '9',
	3: '♯9',
	5: '11',
	6: '♯11',
	8: '♭13',
	9: '13',
	10: '♭7',
	11: '7'
};

/**
 * @typedef {import('./chordScaleFor.js').PlainKey} PlainKey
 * @typedef {import('./chordScaleFor.js').PlainChord} PlainChord
 * @typedef {import('./chordTypes.js').ChordType} ChordType
 * @typedef {import('./noteRoles.js').RoledNote} RoledNote
 * @typedef {{ notes: RoledNote[], next: PlainChord | null }} Occurrence one time the chord plays:
 *   the melody notes that belong to it (noteRoles.js), and the chord after it
 * @typedef {'tone' | 'tension' | 'blue' | 'suspension'} FitRole
 * @typedef {{ pitchClass: number, role: FitRole, as: string }} TargetAs a target note, as this chord hears it
 * @typedef {{ root: number, type: ChordType, does: string, scale: string, score: number, targets: TargetAs[] }} Fit
 */

/**
 * @param {PlainKey} key
 * @param {Occurrence[]} occurrences every time the chord plays (a section played twice: twice)
 * @returns {Fit[]} best first; empty when there's no melody under the chord
 */
export function chordsThatFit(key, occurrences) {
	if (!occurrences.some(({ notes }) => notes.some(mustFit))) return [];
	/** @type {Fit[]} */
	const fits = [];
	for (let root = 0; root < 12; root++) {
		for (const type of CHORD_TYPES) {
			const fit = fitEverywhere(key, { root, type }, occurrences);
			if (fit) fits.push(fit);
		}
	}
	return fits.sort((a, b) => b.score - a.score);
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {Occurrence[]} occurrences
 * @returns {Fit | null}
 */
function fitEverywhere(key, chord, occurrences) {
	let total = 0;
	let weight = 0;
	let heard = false;
	/** @type {Map<number, TargetAs>} */
	const targets = new Map();
	let first = null;
	for (const { notes, next } of occurrences) {
		const scale = chordScaleFor(key, chord, next);
		first ??= scale;
		heard ||= notes.some((note) => scale.roles.get(mod12(note.pitch - chord.root)) === 'tone');
		for (const note of notes.filter(mustFit)) {
			const as = targetAs(key, chord, scale, note.pitch) ?? suspendedInto(chord, scale, note);
			if (!as) return null;
			const noteWeight = note.length * (note.onBoom ? BOOM_WEIGHT : 1);
			total += noteWeight * FIT_WEIGHT[as.role];
			weight += noteWeight;
			targets.set(as.pitchClass, as);
		}
	}
	if (!first || weight === 0 || !heard) return null;
	return {
		...chord,
		does: first.does,
		scale: first.scale,
		score: total / weight - plainness(key, chord),
		targets: [...targets.values()]
	};
}

/**
 * Every note but an approach note is heard against the chord.
 * @param {RoledNote} note
 */
function mustFit(note) {
	return note.role !== 'approach';
}

/**
 * A note held over from the chord before that steps into one of this
 * chord's notes: it fits as a suspension (or a retardation).
 * @param {PlainChord} chord
 * @param {import('./chordScaleFor.js').ChordScale} scale
 * @param {RoledNote} note
 * @returns {TargetAs | null}
 */
function suspendedInto(chord, scale, note) {
	if (note.resolvesTo === null) return null;
	const resolution = scale.roles.get(mod12(note.resolvesTo - chord.root));
	if (resolution !== 'tone') return null;
	return { pitchClass: mod12(note.pitch), role: 'suspension', as: note.role };
}

/**
 * How far the chord is from a plain chord of the key: each note outside
 * the key and each note beyond the triad.
 * @param {PlainKey} key
 * @param {PlainChord} chord
 */
function plainness(key, chord) {
	const tones = toneSemitones(chord.type);
	const scale = key.minor ? MINOR_SCALE : MAJOR_SCALE;
	const outside = tones.filter((tone) => !scale.includes(mod12(chord.root + tone - key.tonic)));
	return outside.length * OUTSIDE_KEY_PENALTY + Math.max(0, tones.length - 3) * EXTENSION_PENALTY;
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {import('./chordScaleFor.js').ChordScale} scale
 * @param {number} pitch
 * @returns {TargetAs | null} null: the note clashes with this chord
 */
function targetAs(key, chord, scale, pitch) {
	const pitchClass = mod12(pitch);
	const above = mod12(pitch - chord.root);
	const role = scale.roles.get(above);
	if (role === 'tone') return { pitchClass, role, as: toneName(chord.type, above) };
	if (role === 'tension') return { pitchClass, role, as: TENSION_NAMES[/** @type {1} */ (above)] };
	if (isBlueNote(key, chord, above))
		return { pitchClass, role: 'blue', as: `blue ${TENSION_NAMES[/** @type {3} */ (above)]}` };
	return null;
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number} above
 */
function isBlueNote(key, chord, above) {
	return (
		BLUE_NOTES.types.includes(chord.type.suffix) &&
		BLUE_NOTES.numerals.includes(numeral(key, chord.root)) &&
		BLUE_NOTES.semitones.includes(above)
	);
}

/**
 * A chord tone's name: "root", "3rd", "♭7th".
 * @param {ChordType} type
 * @param {number} above
 */
function toneName(type, above) {
	const label = readDegrees(type.tones).find((degree) => degree.semitones === above)?.label ?? '';
	if (label === '1') return 'root';
	const number = label.replace(/^[b#]+/, '');
	const accidental = label
		.slice(0, label.length - number.length)
		.replace(/b/g, '♭')
		.replace(/#/g, '♯');
	return `${accidental}${number}${ORDINAL[/** @type {'3'} */ (number)] ?? 'th'}`;
}

const ORDINAL = { 2: 'nd', 3: 'rd' };

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;
