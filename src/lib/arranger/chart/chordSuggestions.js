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
import { chordTypeOf } from '../theory/chordTypes.js';
import { chordsThatFit } from '../theory/chordsThatFit.js';
import { melodyTargets } from '../theory/melodyTargets.js';

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
 * @returns {Suggestion[]} best first; empty when no melody sounds under the chord
 */
export function chordSuggestions(sections, melody, place, capo) {
	const key = songKey(sections);
	if (!key) return [];
	const { slots, beats } = rhythm(sections);
	const booms = beats.filter((beat) => beat.role === 'boom').map((beat) => beat.time);
	const notes = melody
		.map((note) => ({ ...note, pitch: note.pitch - capo }))
		.sort((a, b) => a.time - b.time);

	const plays = slots.flatMap((slot, index) => (isAt(slot, place) ? [index] : []));
	if (plays.length === 0) return [];
	const slotKey = slots[plays[0]].key ?? key;
	const occurrences = plays.map((index) => ({
		notes: melodyTargets(notes, slots[index], booms),
		next: plainChord(nextChord(slots, index))
	}));
	const current = withoutVariant(slots[plays[0]].name);

	return chordsThatFit({ tonic: notePc(slotKey.tonic), minor: slotKey.minor }, occurrences).map(
		(fit) => {
			const name = noteName(noteOfKey(slotKey.tonic, fit.root)) + fit.type.suffix;
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
		}
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
function plainChord(name) {
	const chord = name && parseChord(withoutVariant(name));
	const type = chord && chordTypeOf(chord.rest);
	return chord && type ? { root: notePc(chord.root), type } : null;
}
