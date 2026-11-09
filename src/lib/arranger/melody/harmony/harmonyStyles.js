/**
 * Ways to harmonise a melody. There's no one right harmony, so a part can
 * be written in any of these and the singer picks by ear. Each style picks
 * the part's note against one melody note, knowing the chord under it and
 * the note the part sang before. A new style is one entry in the list.
 *
 * Notes are steps of the key (theory/musicInKey.js). `count` is the part's
 * place around the lead (harmonyParts.js): 1 the next chord tone up, -1 the
 * next down, 2 and -2 one further.
 */
import { chordScale } from '../../theory/chordScales.js';
import { semitones } from '../../theory/musicInKey.js';
import { harmonyNote } from './harmonyNote.js';

/* Parts count root, third and fifth: a 7th chord's seventh is treated as a passing note. */
const TRIAD = 3;
/** How far from the lead a part may sing, in semitones, by how far out it sits. */
const RANGE = { 1: [1, 9], 2: [5, 16] };

/**
 * @typedef {import('../../theory/musicInKey.js').Note} Note
 * @typedef {import('../../theory/musicInKey.js').Chord} Chord
 * @typedef {{ lead: Note, chord: Chord, count: number, previous: Note | null }} Moment
 */

export const HARMONY_STYLES = Object.freeze([
	{
		id: 'stack',
		name: 'Bluegrass stack',
		/** The next chord tone up or down from the lead: the classic sound. */
		pick: (/** @type {Moment} */ { lead, chord, count }) => harmonyNote(lead, chord, count)
	},
	{
		id: 'smooth',
		name: 'Smooth',
		/** The chord tone nearest the last note sung (on the part's side of the lead). */
		pick: (/** @type {Moment} */ moment) => nearestChordTone(moment) ?? stack(moment)
	},
	{
		id: 'holds',
		name: 'Holds through passing notes',
		/** The stack on chord tones; on a passing note, keep singing the last note. */
		pick: (/** @type {Moment} */ moment) =>
			isChordTone(moment.lead, moment.chord) ? stack(moment) : (kept(moment) ?? stack(moment))
	},
	{
		id: 'fewest',
		name: 'Fewest moves',
		/** Stay on the last note while it still fits the chord; else move as little as possible. */
		pick: (/** @type {Moment} */ moment) =>
			(stillFits(moment) ? moment.previous : null) ??
			(isChordTone(moment.lead, moment.chord) ? nearestChordTone(moment) : kept(moment)) ??
			stack(moment)
	},
	{
		id: 'parallel',
		name: 'Parallel thirds and sixths',
		/** Twin-fiddle style: a third, or a sixth when the third isn't a chord tone. */
		pick: (/** @type {Moment} */ moment) => parallelTone(moment)
	}
]);

/** @typedef {(typeof HARMONY_STYLES)[number]['id']} HarmonyStyleId */

/** @param {string} id */
export function harmonyStyle(id) {
	return HARMONY_STYLES.find((style) => style.id === id) ?? HARMONY_STYLES[0];
}

/**
 * A third from the lead, or a sixth when the third isn't a chord tone (a 7th
 * or tension is not sung): twin-fiddle thirds and sixths. Over a passing
 * note it stays a plain third, parallel with the tune. The outer part counts
 * a sixth, then a tenth.
 * @param {Moment} moment
 */
function parallelTone({ lead, chord, count }) {
	const direction = Math.sign(count);
	const intervals = Math.abs(count) === 1 ? [2, 5] : [5, 9];
	const candidates = intervals.map((interval) => ({
		step: lead.step + direction * interval,
		alt: 0
	}));
	if (!isChordTone(lead, chord)) return candidates[0];
	return candidates.find((note) => isChordTone(note, chord)) ?? candidates[0];
}

/** @param {Moment} moment */
function stack({ lead, chord, count }) {
	return harmonyNote(lead, chord, count);
}

/**
 * The chord tone in the part's range nearest the note it sang last (null
 * on a passing note, or for the first note).
 * @param {Moment} moment
 */
function nearestChordTone({ lead, chord, count, previous }) {
	if (!previous || !isChordTone(lead, chord)) return null;
	const target = semitones(previous);
	const options = tonesInRange(lead, chord, count);
	options.sort((a, b) => Math.abs(semitones(a) - target) - Math.abs(semitones(b) - target));
	return options[0] ?? null;
}

/**
 * The last note again, if it's still on the part's side of the lead and in range.
 * @param {Moment} moment
 */
function kept({ lead, count, previous }) {
	return previous && inRange(lead, previous, count) ? previous : null;
}

/**
 * The last note is a chord tone of this chord and still in range.
 * @param {Moment} moment
 */
function stillFits(moment) {
	return Boolean(kept(moment)) && isChordTone(/** @type {Note} */ (moment.previous), moment.chord);
}

/**
 * The chord's root, third and fifth in every octave, within the part's range of the lead.
 * @param {Note} lead
 * @param {Chord} chord
 * @param {number} count
 */
function tonesInRange(lead, chord, count) {
	const triad = chordScale(chord).tones.slice(0, TRIAD);
	return [-2, -1, 0, 1, 2]
		.flatMap((octave) =>
			triad.map((tone) => ({
				step: lead.step + mod(tone.step - lead.step, 7) + 7 * octave,
				alt: tone.alt
			}))
		)
		.filter((note) => inRange(lead, note, count));
}

/**
 * @param {Note} lead
 * @param {Note} note
 * @param {number} count
 */
function inRange(lead, note, count) {
	const [near, far] = RANGE[/** @type {1 | 2} */ (Math.min(2, Math.abs(count)))];
	const distance = (semitones(note) - semitones(lead)) * Math.sign(count);
	return distance >= near && distance <= far;
}

/**
 * @param {Note} note
 * @param {Chord} chord
 */
function isChordTone(note, chord) {
	return chordScale(chord)
		.tones.slice(0, TRIAD)
		.some((tone) => mod(semitones(tone) - semitones(note), 12) === 0);
}

/** @param {number} n @param {number} m */
const mod = (n, m) => ((n % m) + m) % m;
