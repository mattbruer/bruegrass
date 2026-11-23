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
/**
 * Which colour notes (tensions) a melody note on a strong beat may be: the
 * user's choice (docs/theory/applying-the-theory.md, call B). Bluegrass
 * harmonises strong beats with chord notes; "sweet" adds the pentatonic
 * colours bluegrass melodies sit on. Semitones above the root; null: any.
 */
export const STRONG_BEAT_COLOURS = Object.freeze({
	chordNotes: { major: [], minor: [] },
	sweet: { major: [2, 9], minor: [2, 5, 10] },
	any: null
});
/** The order colour allowances loosen in: a weaker beat allows the next one along (call A). */
const LOOSER = /** @type {const} */ (['chordNotes', 'sweet', 'any']);
/** A beat this strong or stronger follows the user's choice exactly. */
const STRONG = 2;
/** A strong-beat share this close counts as the same, so the next rule decides. */
const SHARE_STEP = 0.05;
/** A dominant or its tritone sub resolving to the next chord: it leads into it. */
const LEADS_ON = /^(sub)?V7?(\/|$)/;

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
 * @typedef {{
 *   root: number, type: ChordType, does: string, scale: string, targets: TargetAs[],
 *   strongShare: number, extensions: number, outside: number, leadsOn: boolean, score: number
 * }} Fit
 *   how it ranks (call D), in order: strongShare, how much of the strong-beat melody is its
 *   chord notes; extensions, its notes beyond the triad; outside, its notes outside the key;
 *   leadsOn, it leads into the next chord; score, how well everything fits (the last tie-break)
 * @typedef {keyof typeof STRONG_BEAT_COLOURS} StrongBeats
 * @typedef {RoledNote & { counted: boolean, ruledOut?: boolean, as: string }} HeardNote one melody
 *   note, as a chord hears it: counted (it has to fit), ruledOut (it rules the chord out), and
 *   what it is in the chord ("3rd", "9", "clashes", "13: colour on a strong beat")
 */

/**
 * @param {PlainKey} key
 * @param {Occurrence[]} occurrences every time the chord plays (a section played twice: twice)
 * @param {StrongBeats} strongBeats which colour notes a strong-beat note may be
 * @returns {Fit[]} best first; empty when there's no melody under the chord
 */
export function chordsThatFit(key, occurrences, strongBeats) {
	if (!occurrences.some(({ notes }) => notes.length > 0)) return [];
	const heard = heardOccurrences(occurrences);
	/** @type {Fit[]} */
	const fits = [];
	for (let root = 0; root < 12; root++) {
		for (const type of CHORD_TYPES) {
			const fit = fitEverywhere(key, { root, type }, heard, strongBeats);
			if (fit) fits.push(fit);
		}
	}
	return fits.sort(byRank);
}

/**
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {Occurrence[]} occurrences
 * @param {StrongBeats} strongBeats
 * @returns {Fit | null}
 */
function fitEverywhere(key, chord, occurrences, strongBeats) {
	let total = 0;
	let weight = 0;
	let strong = 0;
	let strongTones = 0;
	let heard = false;
	/** @type {Map<number, TargetAs>} */
	const targets = new Map();
	let first = null;
	for (const { notes, next } of occurrences) {
		const scale = chordScaleFor(key, chord, next);
		first ??= scale;
		heard ||= notes.some((note) => scale.roles.get(mod12(note.pitch - chord.root)) === 'tone');
		for (const note of notes.filter(mustFit)) {
			const as = countedAs(key, chord, scale, note, strongBeats);
			if (typeof as === 'string') return null;
			const noteWeight = note.length * (1 + note.strength);
			total += noteWeight * FIT_WEIGHT[as.role];
			weight += noteWeight;
			if (note.onBoom) {
				strong += noteWeight;
				if (as.role === 'tone') strongTones += noteWeight;
			}
			targets.set(as.pitchClass, as);
		}
	}
	if (!first || weight === 0 || !heard) return null;
	const tones = toneSemitones(chord.type);
	return {
		...chord,
		does: first.does,
		scale: first.scale,
		targets: [...targets.values()],
		strongShare: strong > 0 ? strongTones / strong : 1,
		extensions: Math.max(0, tones.length - 3),
		outside: outsideTheKey(key, chord, tones),
		leadsOn: LEADS_ON.test(first.does),
		score: total / weight
	};
}

/**
 * A chord put under nothing but approach notes is heard against them.
 * @param {Occurrence[]} occurrences
 * @returns {Occurrence[]}
 */
function heardOccurrences(occurrences) {
	if (occurrences.some(({ notes }) => notes.some(mustFit))) return occurrences;
	return occurrences.map((occurrence) => ({
		...occurrence,
		notes: occurrence.notes.map((note) => ({
			...note,
			role: /** @type {const} */ ('target'),
			because: /** @type {const} */ ('nothing else plays here')
		}))
	}));
}

/**
 * Every melody note of one time the chord plays, as this chord hears it,
 * and whether the chord fits (the same rules as chordsThatFit): to show why.
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {Occurrence} occurrence
 * @param {StrongBeats} strongBeats
 * @returns {{ fits: boolean, does: string, scale: string, notes: HeardNote[] }}
 */
export function hearChord(key, chord, occurrence, strongBeats) {
	const [heard] = heardOccurrences([occurrence]);
	const scale = chordScaleFor(key, chord, heard.next);
	const notes = heard.notes.map((note) => {
		const counted = mustFit(note);
		if (!counted)
			return { ...note, counted, as: targetAs(key, chord, scale, note.pitch)?.as ?? 'not in it' };
		const as = countedAs(key, chord, scale, note, strongBeats);
		return {
			...note,
			counted,
			ruledOut: typeof as === 'string',
			as: typeof as === 'string' ? as : as.as
		};
	});
	const isHeard = notes.some((note) => scale.roles.get(mod12(note.pitch - chord.root)) === 'tone');
	const fits = isHeard && !notes.some((note) => note.ruledOut);
	return { fits, does: scale.does, scale: scale.scale, notes };
}

/**
 * A counted note as this chord hears it, or why it rules the chord out:
 * it clashes, or it's a colour note on a strong beat the user's choice
 * doesn't allow on its beat. A blue note or a suspension is allowed anywhere.
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {import('./chordScaleFor.js').ChordScale} scale
 * @param {RoledNote} note
 * @param {StrongBeats} strongBeats
 * @returns {TargetAs | string}
 */
function countedAs(key, chord, scale, note, strongBeats) {
	const as = targetAs(key, chord, scale, note.pitch) ?? suspendedInto(chord, scale, note);
	if (!as) return 'clashes';
	if (as.role !== 'tension') return as;
	const allowed = STRONG_BEAT_COLOURS[colourAllowedOn(note.strength, strongBeats)];
	if (allowed === null) return as;
	const minor = toneSemitones(chord.type).includes(3);
	const above = mod12(note.pitch - chord.root);
	return allowed[minor ? 'minor' : 'major'].includes(above)
		? as
		: `${as.as}: colour on ${note.onBoom ? 'a strong beat' : 'this beat'}`;
}

/**
 * How much colour a beat allows: the user's choice on the downbeat and the
 * bass's other beats, one step more on the other beats, any between beats.
 * @param {import('./noteRoles.js').Strength} strength
 * @param {StrongBeats} strongBeats
 * @returns {StrongBeats}
 */
function colourAllowedOn(strength, strongBeats) {
	if (strength >= STRONG) return strongBeats;
	if (strength === 0) return 'any';
	return LOOSER[Math.min(LOOSER.indexOf(strongBeats) + 1, LOOSER.length - 1)];
}

/**
 * The order suggestions come in (call D): most of the strong-beat melody as
 * chord notes, then plainer chords, then in the key, then leading into the
 * next chord, then how well everything fits.
 * @param {Fit} a
 * @param {Fit} b
 */
function byRank(a, b) {
	const share = Math.round(b.strongShare / SHARE_STEP) - Math.round(a.strongShare / SHARE_STEP);
	return (
		share ||
		a.extensions - b.extensions ||
		a.outside - b.outside ||
		Number(b.leadsOn) - Number(a.leadsOn) ||
		b.score - a.score
	);
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
 * How many of the chord's notes are outside the key.
 * @param {PlainKey} key
 * @param {PlainChord} chord
 * @param {number[]} tones
 */
function outsideTheKey(key, chord, tones) {
	const scale = key.minor ? MINOR_SCALE : MAJOR_SCALE;
	return tones.filter((tone) => !scale.includes(mod12(chord.root + tone - key.tonic))).length;
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
