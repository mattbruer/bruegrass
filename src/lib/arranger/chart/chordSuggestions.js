/**
 * Every chord that could go on a spot of the chart (chordSpot.js: a bar and
 * a beat, written chord or not), from the melody under it until the bar's
 * next chord (theory/chordsThatFit.js), named the way the chart writes
 * chords: guitar shapes, spelled in the key.
 *
 * Works in the shapes' pitch (the melody moved down by the capo), so a
 * suggestion is a chord to type straight into the chart.
 */
import { rhythm } from './timeline.js';
import { noteName, noteOfKey, notePc, parseChord, songKey } from './key.js';
import { withoutVariant } from '../instruments/chordBook.js';
import { isNoChord } from './noChord.js';
import { chordPitchClasses, chordTypeOf } from '../theory/chordTypes.js';
import { chordsThatFit } from '../theory/chordsThatFit.js';
import { noteRoles } from '../theory/noteRoles.js';
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
 * @param {number} capo
 * @returns {Suggestion[]} the chord sounding there now first (when it fits), then best first;
 *   empty when no melody sounds there
 */
export function chordSuggestions(sections, melody, spot, capo) {
	const songsKey = songKey(sections);
	if (!songsKey) return [];
	const { slots, beats } = rhythm(sections);
	const spans = spansOf(slots, spot);
	if (spans.length === 0) return [];
	const booms = beats.filter((beat) => beat.role === 'boom').map((beat) => beat.time);
	const notes = melody
		.map((note) => ({ ...note, pitch: note.pitch - capo }))
		.sort((a, b) => a.time - b.time);
	const roled = noteRoles(notes, bandOf(slots, booms));
	const occurrences = spans.map((span) => ({
		notes: notesOf(roled, span),
		next: plainChord(nextChord(slots, span))
	}));
	const key = slots[spans[0].slot].key ?? songsKey;
	const current = withoutVariant(slots[spans[0].slot].name);

	return chordsThatFit(plainKey(key), occurrences)
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
 * The band as noteRoles reads it: when the bass plays, when the chord
 * changes, and the notes of the chord sounding at any time.
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number[]} booms
 * @returns {import('../theory/noteRoles.js').Band}
 */
function bandOf(slots, booms) {
	const changes = slots
		.filter((slot, i) => slot.name !== slots[i - 1]?.name)
		.map((slot) => slot.start);
	return {
		isBoom: (time) => booms.some((boom) => Math.abs(boom - time) < EPSILON),
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
