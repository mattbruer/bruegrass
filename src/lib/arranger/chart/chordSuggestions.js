/**
 * Every chord that could go on a spot of the chart (chordSpot.js: a bar and
 * a beat, written chord or not), from the melody under it until the bar's
 * next chord (theory/chordsThatFit.js), named the way the chart writes
 * chords: guitar shapes, spelled in the key.
 *
 * The chart and the tune are in the same key, so a suggestion is a chord to
 * type straight into the chart.
 */
import { rhythm } from './timeline.js';
import { noteName, noteOfKey, notePc, parseChord, songKey } from './key.js';
import { withoutVariant } from '../instruments/chordBook.js';
import { isNoChord } from './noChord.js';
import { chordPitchClasses, chordTypeOf } from '../theory/chordTypes.js';
import { chordsThatFit, hearChord } from '../theory/chordsThatFit.js';
import { beatStrength, noteRoles } from '../theory/noteRoles.js';
import { spansOf } from './chordSpot.js';

const EPSILON = 1e-6;

/**
 * @typedef {import('./chordSpot.js').ChordSpot} ChordSpot
 * @typedef {{
 *   name: string, does: string, scale: string, bluegrass: boolean, current: boolean,
 *   targets: { note: string, as: string }[]
 * }} Suggestion
 *   does: what it would do there ("V7/V"); targets: each melody note it fits, as it hears it ("B", "3rd")
 */

/**
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody the tune's lead notes at concert pitch
 * @param {ChordSpot} spot
 * @param {import('../theory/chordsThatFit.js').StrongBeats} strongBeats which colour notes a
 *   strong-beat note may be (the user's setting)
 * @returns {Suggestion[]} the chord sounding there now first (when it fits), then best first;
 *   empty when no melody sounds there
 */
export function chordSuggestions(sections, melody, spot, strongBeats) {
	const read = readSpot(sections, melody, spot);
	if (!read) return [];
	const { key, current, occurrences } = read;
	return chordsThatFit(plainKey(key), occurrences, strongBeats)
		.map((fit) => {
			const name = chordNameIn(key, fit);
			return {
				name,
				does: fit.does,
				scale: fit.scale,
				bluegrass: fit.type.bluegrass,
				current: name === current,
				targets: fit.targets.map((target) => ({
					note: noteName(noteOfKey(key.tonic, target.pitchClass)),
					as: target.as
				}))
			};
		})
		.sort((a, b) => Number(b.current) - Number(a.current));
}

/**
 * @typedef {{
 *   beat: string, note: string, length: string, strong: boolean, role: string,
 *   counted: boolean, ruledOut: boolean, as: string
 * }} BreakdownRow one melody note in words: where it falls ("2½"), how long ("quarter"),
 *   what it's doing ("heard as the chord: a strong beat"), and what it is in the chord
 * @typedef {{ fits: boolean, does: string, scale: string, rows: BreakdownRow[] }} Breakdown
 */

/**
 * Why a chord fits a spot or not, note by note, the first time the spot
 * plays: the same rules as the suggestions (theory/chordsThatFit.js hearChord).
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody at concert pitch
 * @param {ChordSpot} spot
 * @param {string} name any chord name, as the chart writes it
 * @param {import('../theory/chordsThatFit.js').StrongBeats} strongBeats
 * @returns {Breakdown | null} null: no melody there, or a chord the theory doesn't know
 */
export function chordBreakdown(sections, melody, spot, name, strongBeats) {
	const read = readSpot(sections, melody, spot);
	const chord = plainChord(name);
	if (!read || !chord || read.occurrences[0].notes.length === 0) return null;
	const { key, barStart, occurrences } = read;
	const heard = hearChord(plainKey(key), chord, occurrences[0], strongBeats);
	return {
		fits: heard.fits,
		does: heard.does,
		scale: heard.scale,
		rows: heard.notes.map((note) => ({
			beat: beatName(note.time - barStart),
			note: noteName(noteOfKey(key.tonic, note.pitch)),
			length: lengthName(note.length),
			strong: note.onBoom,
			role: roleWords(note),
			counted: note.counted,
			ruledOut: Boolean(note.ruledOut),
			as: note.as
		}))
	};
}

/**
 * The melody and band at a spot, read once for the suggestions and the breakdown.
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody
 * @param {ChordSpot} spot
 */
function readSpot(sections, melody, spot) {
	const songsKey = songKey(sections);
	if (!songsKey) return null;
	const { slots, beats } = rhythm(sections);
	const spans = spansOf(slots, spot);
	if (spans.length === 0) return null;
	const notes = [...melody].sort((a, b) => a.time - b.time);
	const roled = noteRoles(notes, bandOf(slots, beats));
	const first = slots[spans[0].slot];
	return {
		key: first.key ?? songsKey,
		current: withoutVariant(first.name),
		barStart: first.barStart,
		occurrences: spans.map((span) => ({
			notes: notesOf(roled, span),
			next: plainChord(nextChord(slots, span))
		}))
	};
}

/** @param {number} quarters from the bar's start */
function beatName(quarters) {
	const beat = Math.floor(quarters + EPSILON);
	const part = quarters - beat;
	const fraction = FRACTIONS.find(([value]) => Math.abs(value - part) < EPSILON)?.[1];
	return fraction === undefined ? (quarters + 1).toFixed(2) : `${beat + 1}${fraction}`;
}

const FRACTIONS = /** @type {[number, string][]} */ ([
	[0, ''],
	[0.25, '¼'],
	[0.5, '½'],
	[0.75, '¾'],
	[1 / 3, '⅓'],
	[2 / 3, '⅔']
]);

const LENGTHS = /** @type {[number, string][]} */ ([
	[4, 'whole'],
	[3, 'dotted half'],
	[2, 'half'],
	[1.5, 'dotted quarter'],
	[1, 'quarter'],
	[0.75, 'dotted eighth'],
	[0.5, 'eighth'],
	[1 / 3, 'triplet eighth'],
	[0.25, 'sixteenth']
]);

/** @param {number} quarters */
function lengthName(quarters) {
	return (
		LENGTHS.find(([value]) => Math.abs(value - quarters) < EPSILON)?.[1] ??
		`${Number(quarters.toFixed(2))} beats`
	);
}

const APPROACH_WORDS = {
	passing: 'passing: steps on to the next note',
	neighbour: 'neighbour: steps away and back',
	escape: 'escape tone: stepped to, then leaps away'
};

/** @param {import('../theory/noteRoles.js').RoledNote} note */
function roleWords(note) {
	if (note.role === 'target') return `heard as the chord: ${note.because}`;
	if (note.role === 'approach') return `${APPROACH_WORDS[note.kind ?? 'passing']}, not counted`;
	if (note.role === 'anticipation') return 'anticipation: arrives early for this chord';
	return `${note.role}: held over from the chord before, then steps ${note.role === 'suspension' ? 'down' : 'up'}`;
}

/**
 * The band as noteRoles reads it: how strong each beat is (from where the
 * bass plays), when the chord changes, and the notes of the chord sounding at any time.
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {import('./timeline.js').Beat[]} beats
 * @returns {import('../theory/noteRoles.js').Band}
 */
function bandOf(slots, beats) {
	const changes = slots
		.filter((slot, i) => slot.name !== slots[i - 1]?.name)
		.map((slot) => slot.start);
	return {
		strengthAt: (time) => {
			const slot = slotAt(slots, time);
			if (!slot) return 0;
			const booms = beats
				.filter((beat) => beat.bar === slot.bar && beat.role === 'boom')
				.map((beat) => beat.time - slot.barStart);
			return beatStrength(time - slot.barStart, booms);
		},
		changes,
		tonesAt: (time) => {
			const chord = plainChord(slotAt(slots, time)?.name ?? null);
			return chord ? chordPitchClasses(chord) : [];
		}
	};
}

/**
 * The melody notes that belong to one chord: those sounding under it, its
 * anticipations (arriving early) and not the next chord's; a suspension
 * from the chord before is heard against it.
 * @param {import('../theory/noteRoles.js').RoledNote[]} notes
 * @param {{ start: number, length: number }} span
 */
function notesOf(notes, span) {
	const end = span.start + span.length;
	return notes.filter((note) => {
		if (note.role === 'anticipation')
			return note.chordTime >= span.start - EPSILON && note.chordTime < end - EPSILON;
		return note.time < end - EPSILON && note.time + note.length > span.start + EPSILON;
	});
}

/**
 * The slot sounding at a time.
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number} time
 */
function slotAt(slots, time) {
	return slots.find(
		(slot) => time >= slot.start - EPSILON && time < slot.start + slot.length - EPSILON
	);
}

/**
 * The chord the band plays after a span: the bar's next chord, or the
 * next different one after it (the song goes round: the last leads to the first).
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {import('./chordSpot.js').SpotSpan} span
 */
function nextChord(slots, span) {
	const end = span.start + span.length;
	const after = slots.findIndex((slot) => slot.start >= end - EPSILON);
	const from = after === -1 ? 0 : after;
	for (let step = 0; step < slots.length; step++) {
		const name = slots[(from + step) % slots.length].name;
		if (!isNoChord(name) && name !== slots[span.slot].name) return name;
	}
	return null;
}

/**
 * A chord name as the theory reads it: its root's pitch class and its type
 * (null for a chord the theory doesn't know, or none).
 * @param {string | null} name
 */
export function plainChord(name) {
	const chord = name && !isNoChord(name) ? parseChord(withoutVariant(name)) : null;
	const type = chord && chordTypeOf(chord.rest);
	return chord && type ? { root: notePc(chord.root), type } : null;
}

/**
 * The key as the theory reads it.
 * @param {import('./key.js').Key} key
 */
export function plainKey(key) {
	return { tonic: notePc(key.tonic), minor: key.minor };
}

/**
 * A chord the theory found, named as the chart writes it in this key.
 * @param {import('./key.js').Key} key
 * @param {{ root: number, type: { suffix: string } }} chord
 */
export function chordNameIn(key, chord) {
	return noteName(noteOfKey(key.tonic, chord.root)) + chord.type.suffix;
}
