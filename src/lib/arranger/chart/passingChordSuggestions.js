/**
 * Passing chords for the approach notes under one chord of the chart
 * (theory/passingChords.js): each on the beat its approach note starts on,
 * lasting until the note it leads to, named as the chart writes chords.
 * Only approach notes that start on a beat get one (the chart's chords sit
 * on beats), and only in bars of quarter-note beats. A passing chord must
 * work every time the bar plays.
 */
import { barQuarters } from './timeline.js';
import { noteName, noteOfKey } from './key.js';
import { chordNameIn, plainChord, plainKey, readPlace } from './chordSuggestions.js';
import { melodyTargets } from '../theory/melodyTargets.js';
import { passingChords } from '../theory/passingChords.js';

const EPSILON = 1e-6;
/** Bluegrass ways first: the dominant and the key's own chords, then the jazzier ones. */
const WAY_ORDER = [
	'dominant',
	'diatonic',
	'parallel',
	'chromatic',
	'passing diminished',
	'tritone sub'
];

/**
 * @typedef {{
 *   beat: number, beats: number, name: string, ways: string[], leadsTo: string,
 *   note: string, role: 'tone' | 'tension'
 * }} PassingSuggestion
 *   beat: where in the bar it starts (0 = beat 1); beats: how long; leadsTo: the target's chord;
 *   note: the approach note; role: what that note is in the passing chord
 */

/**
 * @param {import('./timeline.js').Section[]} sections
 * @param {{ time: number, length: number, pitch: number }[]} melody at concert pitch
 * @param {import('./chartAnalysis.js').ChordPlace} place
 * @param {number} capo
 * @returns {PassingSuggestion[]}
 */
export function passingChordSuggestions(sections, melody, place, capo) {
	const at = readPlace(sections, melody, place, capo);
	if (!at) return [];
	const { slots, plays, booms, notes, key } = at;
	const perPlay = plays.map((index) => forOnePlay(slots, index, booms, notes, key));
	const [first, ...others] = perPlay;
	return first
		.filter((option) =>
			others.every((list) =>
				list.some((each) => each.beat === option.beat && each.name === option.name)
			)
		)
		.sort((a, b) => a.beat - b.beat || plainness(a) - plainness(b));
}

/**
 * How jazzy a passing chord is: by the plainest way that reaches it, a
 * triad before a seventh.
 * @param {PassingSuggestion} option
 */
function plainness(option) {
	const rank = Math.min(...option.ways.map((way) => WAY_ORDER.indexOf(way)));
	return rank * 10 + (/\d/.test(option.name) ? 1 : 0);
}

/**
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number} index the slot this time
 * @param {number[]} booms
 * @param {{ time: number, length: number, pitch: number }[]} notes
 * @param {import('./key.js').Key} key
 * @returns {PassingSuggestion[]}
 */
function forOnePlay(slots, index, booms, notes, key) {
	const slot = slots[index];
	if (slot.meter.unit !== 4) return [];
	const barEnd = slot.barStart + barQuarters(slot.meter);
	return melodyTargets(notes, slot, booms)
		.filter(
			(note) => !note.target && isOnABeat(note.time - slot.barStart) && note.time >= slot.start
		)
		.flatMap((approach) => {
			const target = notes.find((note) => note.time > approach.time + EPSILON);
			const targetSlot = target && slotAt(slots, target.time);
			const targetChord = targetSlot && plainChord(targetSlot.name);
			if (!target || !targetSlot || !targetChord) return [];
			const beat = Math.round(approach.time - slot.barStart);
			const until = Math.min(Math.ceil(target.time - EPSILON), barEnd);
			const beats = Math.max(1, Math.round(until - approach.time));
			return passingChords(
				plainKey(key),
				{ approach: approach.pitch, target: target.pitch },
				targetChord
			)
				.map((found) => ({
					beat,
					beats,
					name: chordNameIn(key, found.chord),
					ways: found.ways,
					leadsTo: targetSlot.name,
					note: noteName(noteOfKey(key.tonic, approach.pitch)),
					role: found.role
				}))
				.filter((option) => option.name !== slot.name);
		});
}

/** @param {number} quarters from the bar's start */
function isOnABeat(quarters) {
	return Math.abs(quarters - Math.round(quarters)) < EPSILON;
}

/**
 * The chord sounding at a time (the song goes round, so past the end is the start).
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number} time
 */
function slotAt(slots, time) {
	return (
		slots.find(
			(slot) => time >= slot.start - EPSILON && time < slot.start + slot.length - EPSILON
		) ?? slots[0]
	);
}
