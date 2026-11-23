/**
 * A bar's chords, one slot per beat: the chord that starts on that beat,
 * or null where the chord before carries on. So "G on beat 1, C on beat 3"
 * is ['G', null, 'C', null]. The chart writes chords evenly split over a
 * bar (`G,C` is half and half, the odd beat going to the earlier chords),
 * so a bar's slots are written in the fewest chords that say the same
 * thing (`chartCell`).
 */
import { beatGroups } from '../chart/timeline.js';
import { NO_CHORD } from '../chart/noChord.js';
import { withBarChords } from '../chart/withBarChords.js';

/** @typedef {(string | null)[]} Slots */

/**
 * The beats a chord may change on: where the band's boom falls (beats 1
 * and 3 in 4/4; bluegrass doesn't change chords faster), except in 3/4,
 * where any beat can.
 * @param {number} beats
 * @returns {number[]}
 */
export function chordPlaces(beats) {
	if (beats === 3) return [0, 1, 2];
	let at = 0;
	return beatGroups(beats).map((group) => {
		const place = at;
		at += group;
		return place;
	});
}

/**
 * The places a bar's boxes go: its chord places, or every beat when the
 * bar already has a chord off them (so opening it loses nothing).
 * @param {Slots} slots
 */
export function placesFor(slots) {
	const places = chordPlaces(slots.length);
	const offPlace = slots.some((slot, beat) => slot && !places.includes(beat));
	return offPlace ? slots.map((_, beat) => beat) : places;
}

/**
 * What's typed in each place's box, back as one slot per beat.
 * @param {(string | null)[]} typed one per place
 * @param {number[]} places
 * @param {number} beats
 * @returns {Slots}
 */
export function slotsFromPlaces(typed, places, beats) {
	/** @type {Slots} */
	const slots = Array(beats).fill(null);
	places.forEach((beat, i) => (slots[beat] = typed[i] ?? null));
	return slots;
}

/**
 * How the chart shares a bar's beats among n chords.
 * @param {number} beats
 * @param {number} n
 */
export function shares(beats, n) {
	const base = Math.floor(beats / n);
	return Array.from({ length: n }, (_, i) => base + (i < beats % n ? 1 : 0));
}

/**
 * A bar's slots as stored, fitted to its beats.
 * @param {Slots | undefined} stored
 * @param {number} beats
 * @returns {Slots}
 */
export function slotsOf(stored, beats) {
	const slots = (stored ?? []).slice(0, beats);
	return [...slots, ...Array(beats - slots.length).fill(null)];
}

/** @param {Slots} slots */
export function isEmptyBar(slots) {
	return slots.every((slot) => !slot);
}

/**
 * A bar left empty in the chart (`|G| |`): it holds the chord before.
 * Stored as slots with no chord in any; a bar with no chord (N.C.) has
 * nothing stored.
 * @param {Slots | undefined} stored
 */
export function isHeld(stored) {
	return Array.isArray(stored) && isEmptyBar(stored);
}

/**
 * The bar as the chart writes it ("G", "G,C", "G,C,C,C"). A bar starting
 * with no chord carries on `carried` (the last chord before it).
 * @param {Slots} slots
 * @param {string} carried
 * @returns {string}
 */
export function chartCell(slots, carried) {
	let last = carried;
	const perBeat = slots.map((slot) => (last = slot || last));
	for (let n = 1; n <= perBeat.length; n++) {
		const lengths = shares(perBeat.length, n);
		const names = [];
		let at = 0;
		for (const length of lengths) {
			names.push(perBeat[at]);
			at += length;
		}
		const spread = lengths.flatMap((length, i) => Array(length).fill(names[i]));
		if (spread.every((name, i) => name === perBeat[i])) return names.join(',');
	}
	return perBeat.join(',');
}

/**
 * Each change in a bar, for drawing: which beat it starts on and how many beats it lasts.
 * @param {Slots} slots
 * @returns {{ name: string, beat: number, beats: number }[]}
 */
export function changesIn(slots) {
	const starts = slots.flatMap((slot, beat) => (slot ? [{ name: slot, beat }] : []));
	return starts.map((change, i) => ({
		...change,
		beats: (starts[i + 1]?.beat ?? slots.length) - change.beat
	}));
}

/**
 * What was typed in a bar's boxes (one per beat, blanks carry on), as its slots.
 * @param {(string | null)[]} typed
 * @param {number} beats
 * @returns {Slots}
 */
export function typedSlots(typed, beats) {
	return slotsOf(
		typed.map((text) => (text ?? '').trim() || null),
		beats
	);
}

/**
 * The last chord sounding before a bar (N.C. if none), past bars that hold.
 * @param {Record<number, Slots>} chords bar number → slots
 * @param {number} number
 */
export function lastChordBefore(chords, number) {
	let before = number - 1;
	while (isHeld(chords[before])) before--;
	return chords[before]?.findLast(Boolean) ?? NO_CHORD;
}

/**
 * A bar's new slots as the chart writes them: N.C. when it's emptied.
 * @param {Record<number, Slots>} chords the bars' chords now
 * @param {number} number the bar being written
 * @param {Slots} slots
 */
export function cellFor(chords, number, slots) {
	return isEmptyBar(slots) ? NO_CHORD : chartCell(slots, lastChordBefore(chords, number));
}

/**
 * The chart with a bar's boxes written in where the bar is written, so
 * the rest stays as typed. A bar emptied while it holds the chord before
 * is left holding.
 * @param {string} text the chart
 * @param {import('./readChartOnBars.js').ChartOnBars} read the chart on its bars
 * @param {number} number the bar
 * @param {(string | null)[]} typed one per beat
 * @returns {string | null} null: the bar isn't in the chart
 */
export function chartWithTypedBar(text, read, number, typed) {
	const place = read.places[number];
	if (!place) return null;
	const slots = typedSlots(typed, typed.length);
	if (isEmptyBar(slots) && isHeld(read.chords[number])) return text;
	return withBarChords(text, place, cellFor(read.chords, number, slots));
}
