/**
 * Every chord that could take the place of one chord of the chart, from
 * the melody under it (theory/chordsThatFit.js), named the way the chart
 * writes chords: guitar shapes, spelled in the key.
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

const EPSILON = 1e-6;

/**
 * @typedef {import('./chartAnalysis.js').ChordPlace} ChordPlace
 * @typedef {{
 *   name: string, does: string, scale: string, bluegrass: boolean, current: boolean,
 *   targets: { note: string, as: string }[]
 * }} Suggestion
 *   does: what it would do there ("V7/V"); targets: each melody note it fits, as it hears it ("B", "3rd")
 */

/**
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody the tune's lead notes at concert pitch
 * @param {ChordPlace} place
 * @param {number} capo
 * @returns {Suggestion[]} the chart's own chord first (when it fits), then best first;
 *   empty when no melody sounds under the chord
 */
export function chordSuggestions(sections, melody, place, capo) {
	const at = readPlace(sections, melody, place, capo);
	if (!at) return [];
	const { slots, plays, booms, notes, key: slotKey } = at;
	const roled = noteRoles(notes, bandOf(slots, booms));
	const occurrences = plays.map((index) => ({
		notes: notesOf(roled, slots[index]),
		next: plainChord(nextChord(slots, index))
	}));
	const current = withoutVariant(slots[plays[0]].name);

	const fits = chordsThatFit(plainKey(slotKey), occurrences);
	return fits
		.map((fit) => {
			const name = chordNameIn(slotKey, fit);
			return {
				name,
				does: fit.does,
				scale: fit.scale,
				bluegrass: fit.type.bluegrass,
				current: name === current,
				targets: fit.targets.map((target) => ({
					note: noteName(noteOfKey(slotKey.tonic, target.pitchClass)),
					as: target.as
				}))
			};
		})
		.sort((a, b) => Number(b.current) - Number(a.current));
}

/**
 * What the suggestions read from the song for one place in the chart: the
 * band's chords and booms, the melody in the shapes' pitch, every time the
 * place plays, and its key (null when the chart has no key yet).
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody at concert pitch
 * @param {ChordPlace} place
 * @param {number} capo
 */
export function readPlace(sections, melody, place, capo) {
	const songsKey = songKey(sections);
	if (!songsKey) return null;
	const { slots, beats } = rhythm(sections);
	const plays = slots.flatMap((slot, index) => (isAt(slot, place) ? [index] : []));
	if (plays.length === 0) return null;
	return {
		slots,
		plays,
		booms: beats.filter((beat) => beat.role === 'boom').map((beat) => beat.time),
		notes: melody
			.map((note) => ({ ...note, pitch: note.pitch - capo }))
			.sort((a, b) => a.time - b.time),
		key: slots[plays[0]].key ?? songsKey
	};
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
 * @param {import('./timeline.js').SlotPosition} slot
 */
function notesOf(notes, slot) {
	const end = slot.start + slot.length;
	return notes.filter((note) => {
		if (note.role === 'anticipation')
			return note.chordTime >= slot.start - EPSILON && note.chordTime < end - EPSILON;
		return note.time < end - EPSILON && note.time + note.length > slot.start + EPSILON;
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
 * @param {import('./timeline.js').SlotPosition} slot
 * @param {ChordPlace} place
 */
function isAt(slot, place) {
	return (
		slot.section === place.section && slot.measure === place.measure && slot.chord === place.chord
	);
}

/**
 * The next chord the band plays (the song goes round: the last leads to the first).
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number} index
 */
function nextChord(slots, index) {
	for (let step = 1; step < slots.length; step++) {
		const name = slots[(index + step) % slots.length].name;
		if (!isNoChord(name) && name !== slots[index].name) return name;
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
