/**
 * One bar of the drawn melody as ABC: notes and rests filling the bar,
 * ties where a note crosses a bar line or a chord change, triplets where
 * the notes fall on thirds of a beat, and a space between beat groups so
 * the sheet music beams by the beat.
 */
import { abcPitch } from '../harmony/abcPitch.js';
import { melodyNote } from '../../theory/musicInKey.js';
import { TICKS_PER_QUARTER } from './ticks.js';

const BEAT = TICKS_PER_QUARTER;
const MIDDLE_C = 60;
/** Straight notes are written as one of these (ticks): whole down to thirty-second, plain or dotted. */
const NOTE_VALUES = [192, 144, 96, 72, 48, 36, 24, 18, 12, 6];
/** The finest straight position: a thirty-second. */
const STRAIGHT = 6;

/**
 * @typedef {import('./editNotes.js').DrawnNote} DrawnNote
 * @typedef {import('./readScore.js').ScoreBar} ScoreBar
 * @typedef {import('./readScore.js').ScoreChord} ScoreChord
 * @typedef {import('../../theory/musicInKey.js').Key} Key
 * @typedef {{ start: number, length: number, midi: number | null, tie: boolean, chord: string | null }} BarEvent
 *   a note (or a rest: midi null) in the bar, start relative to the bar;
 *   tie: held into whatever follows
 */

/**
 * @param {ScoreBar} bar
 * @param {BarEvent[]} events from barEvents
 * @param {{ key: Key, unit: number, pickup?: boolean }} options unit: ticks
 *   in the ABC's L:; pickup: a short first bar, whose beats count back from its end
 */
export function writeBar(bar, events, { key, unit, pickup = false }) {
	const beatShift = pickup ? (barTicks(bar.meter) - bar.length) % BEAT : 0;
	const group = beamGroup(bar.meter);
	const spans = tripletSpans(bar.length, events, beatShift);
	const pieces = splitAt(
		events,
		spans.flatMap((span) => [span.start, span.start + span.length])
	);

	/** @type {Map<number, number>} */
	const accidentals = new Map();
	let previousMidi = /** @type {number | null} */ (null);
	let text = '';

	for (const piece of pieces) {
		const span = spans.find(
			(each) => piece.start >= each.start && piece.start < each.start + each.length
		);
		const startsGroup = (piece.start + beatShift) % group === 0 && piece.start > 0;
		const opensTriplet = span && piece.start === span.start;
		if (startsGroup || (opensTriplet && text && !text.endsWith(' '))) text += ' ';
		text += piece.chord ? `"${piece.chord}"` : '';
		if (opensTriplet) text += tripletMark(span, pieces);

		const lengths = span
			? [(piece.length * 3) / 2]
			: piece.midi === null
				? restValues(piece.start + beatShift, piece.length)
				: noteValues(piece.length);
		const pitch =
			piece.midi === null ? 'z' : abcPitch(key, noteOf(key, piece.midi, previousMidi), accidentals);
		if (piece.midi !== null) previousMidi = piece.midi;

		lengths.forEach((length, i) => {
			const last = i === lengths.length - 1;
			const tied = piece.midi !== null && (!last || piece.tie);
			text += pitch + lengthText(length, unit) + (tied ? '-' : '');
		});
	}
	return text.trim();
}

/**
 * The bar as events: the drawn notes in it, rests in the gaps, and every
 * chord symbol on an event of its own (a note held through a chord change
 * is split and tied).
 * @param {ScoreBar} bar
 * @param {DrawnNote[]} notes
 * @param {ScoreChord[]} chords
 * @returns {BarEvent[]}
 */
export function barEvents(bar, notes, chords) {
	const end = bar.start + bar.length;
	/** @type {BarEvent[]} */
	const events = [];
	let at = bar.start;
	const rest = (/** @type {number} */ until) => {
		if (until > at)
			events.push({
				start: at - bar.start,
				length: until - at,
				midi: null,
				tie: false,
				chord: null
			});
	};
	for (const note of notes) {
		const from = Math.max(note.start, bar.start);
		const to = Math.min(note.start + note.length, end);
		if (to <= from || from < at) continue;
		rest(from);
		events.push({
			start: from - bar.start,
			length: to - from,
			midi: note.midi,
			tie: note.start + note.length > end,
			chord: null
		});
		at = to;
	}
	rest(end);

	const inBar = chords.filter((chord) => chord.at >= bar.start && chord.at < end);
	const split = splitAt(
		events,
		inBar.map((chord) => chord.at - bar.start)
	);
	for (const chord of inBar) {
		const event = split.find((each) => each.start === chord.at - bar.start);
		if (event) event.chord = chord.name;
	}
	return split;
}

/**
 * Split events at these places (relative ticks); a split note is tied.
 * @param {BarEvent[]} events
 * @param {number[]} places
 */
function splitAt(events, places) {
	return events.flatMap((event) => {
		const cuts = [...new Set(places)]
			.filter((place) => place > event.start && place < event.start + event.length)
			.sort((a, b) => a - b);
		if (cuts.length === 0) return [{ ...event }];
		const edges = [event.start, ...cuts, event.start + event.length];
		return edges.slice(0, -1).map((start, i) => ({
			start,
			length: edges[i + 1] - start,
			midi: event.midi,
			tie: i < cuts.length ? event.midi !== null : event.tie,
			chord: i === 0 ? event.chord : null
		}));
	});
}

/**
 * The stretches of the bar written as triplets: a beat whose notes fall
 * on its thirds (eighth triplets), or a half beat on its thirds
 * (sixteenth triplets).
 * @param {number} length the bar's ticks
 * @param {BarEvent[]} events
 * @param {number} beatShift
 * @returns {{ start: number, length: number }[]}
 */
function tripletSpans(length, events, beatShift) {
	const edges = events.flatMap((event) => [event.start, event.start + event.length]);
	const spans = [];
	for (let beat = -beatShift; beat < length; beat += BEAT) {
		for (const span of tripletsIn(beat, BEAT, edges)) {
			if (span.start >= 0 && span.start + span.length <= length) spans.push(span);
		}
	}
	return spans;
}

/**
 * @param {number} start
 * @param {number} length a beat or half a beat
 * @param {number[]} edges
 * @returns {{ start: number, length: number }[]}
 */
function tripletsIn(start, length, edges) {
	const inside = edges
		.filter((edge) => edge > start && edge < start + length)
		.map((edge) => edge - start);
	if (inside.every((edge) => edge % STRAIGHT === 0)) return [];
	if (inside.every((edge) => edge % (length / 3) === 0)) return [{ start, length }];
	if (length < BEAT) return [];
	const half = length / 2;
	return [...tripletsIn(start, half, edges), ...tripletsIn(start + half, half, edges)];
}

/**
 * `(3`, or `(3:2:n` when the triplet holds other than three notes.
 * @param {{ start: number, length: number }} span
 * @param {BarEvent[]} pieces
 */
function tripletMark(span, pieces) {
	const count = pieces.filter(
		(piece) => piece.start >= span.start && piece.start < span.start + span.length
	).length;
	return count === 3 ? '(3' : `(3:2:${count}`;
}

/**
 * A straight length as note values to tie together (largest first).
 * @param {number} ticks
 */
function noteValues(ticks) {
	const values = [];
	let left = ticks;
	while (left > 0) {
		const value = NOTE_VALUES.find((each) => each <= left) ?? left;
		values.push(value);
		left -= value;
	}
	return values;
}

/**
 * A rest's length as rests that line up with the beat: up to the next
 * beat, then whole beats, then what's left.
 * @param {number} start where it starts, counted from a beat
 * @param {number} ticks
 */
function restValues(start, ticks) {
	const toBeat = Math.min(ticks, (BEAT - (start % BEAT)) % BEAT);
	const beats = Math.floor((ticks - toBeat) / BEAT) * BEAT;
	const rest = ticks - toBeat - beats;
	return [toBeat, beats, rest].filter((part) => part > 0).flatMap(noteValues);
}

/**
 * ABC's length after a note: "" for one unit, "2", "/", "3/2", "/4".
 * @param {number} ticks
 * @param {number} unit
 */
export function lengthText(ticks, unit) {
	const divisor = gcd(ticks, unit);
	const num = ticks / divisor;
	const den = unit / divisor;
	if (den === 1) return num === 1 ? '' : String(num);
	if (num === 1) return den === 2 ? '/' : `/${den}`;
	return `${num}/${den}`;
}

/**
 * How to write a pitch in the key (see melodyNote).
 * @param {Key} key
 * @param {number} midi
 * @param {number | null} previous
 */
function noteOf(key, midi, previous) {
	const direction = previous !== null && midi < previous ? -1 : 1;
	return melodyNote(key, midi - MIDDLE_C - key.pc, direction);
}

/** @param {{ num: number, den: number }} meter */
function barTicks(meter) {
	return (meter.num * 4 * BEAT) / meter.den;
}

/**
 * Notes beam together within this many ticks: a dotted quarter in 6/8,
 * 9/8 and 12/8, else a quarter.
 * @param {{ num: number, den: number }} meter
 */
function beamGroup(meter) {
	return meter.den === 8 && meter.num % 3 === 0 ? (BEAT * 3) / 2 : BEAT;
}

/** @param {number} a @param {number} b */
function gcd(a, b) {
	return b === 0 ? a : gcd(b, a % b);
}
