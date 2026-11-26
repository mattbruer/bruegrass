/**
 * A fill: a few notes you write, played where the band's strum
 * would have been. It starts at the bar of the chord you wrote it on and
 * lasts 1 to MAX_FILL_BARS bars, over whatever chords those bars hold.
 * Saved with the chord's changes (guitarEdits.js) as plain data:
 * `{ bars, notes }`, each note's `start` and `length` in ticks from the
 * fill's start (ticks.js) and `midi` the pitch in the chart's key, as written;
 * the Key setting and the capo move it like the rest of the guitar (`fillSpan`).
 */
import { OPEN_MIDI, MAX_FRET } from './guitar.js';
import { barQuarters } from '../chart/timeline.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

/** The pitches the neck has, low E open to the high e's last fret. */
export const FILL_RANGE = { lowest: OPEN_MIDI[0], highest: OPEN_MIDI[5] + MAX_FRET };

/**
 * @typedef {{ bars: number, notes: import('../melody/roll/editNotes.js').DrawnNote[] }} Fill
 * @typedef {{
 *   start: number, bars: number, length: number, meter: import('../chart/timeline.js').Meter,
 *   notes: import('../melody/roll/editNotes.js').DrawnNote[],
 *   played: { start: number, length: number, string: number, fret: number }[]
 * }} FillSpan start and length in quarters, from bar 1 of the song; played: each note on its string, in ticks
 */

/** @returns {Fill} */
export function emptyFill() {
	return { bars: 1, notes: [] };
}

/** The most bars one fill lasts. */
export const MAX_FILL_BARS = 4;

/**
 * How many bars of fill can start at this bar: up to MAX_FILL_BARS, and not
 * past the end of the song's pass.
 * @param {number} barStart quarters from bar 1
 * @param {import('../chart/timeline.js').Meter} meter
 * @param {number} songQuarters length of one pass
 */
export function fillRoom(barStart, meter, songQuarters) {
	const left = Math.floor((songQuarters - barStart) / barQuarters(meter) + 1e-6);
	return Math.max(0, Math.min(MAX_FILL_BARS, left));
}

/**
 * Where a chord's fill is in the song: from the start of the chord's bar,
 * over the following bars and whatever chords they hold (null: no room).
 * @param {Fill | undefined} fill
 * @param {{ barStart: number, meter: import('../chart/timeline.js').Meter, room: number, shift?: number }} where
 * shift: semitones the hand's shapes are from the chart's (the Key less the capo): the fill's notes are written in the chart's key
 * @returns {FillSpan | null}
 */
export function fillSpan(fill, { barStart, meter, room, shift = 0 }) {
	if (!fill || !Array.isArray(fill.notes) || room === 0) return null;
	const bars = Math.min(Math.max(fill.bars, 1), room);
	const length = bars * barQuarters(meter);
	const notes = keepWithin(fill.notes, length * TICKS_PER_QUARTER);
	const played = notes.flatMap(({ midi, start, length }) => {
		const spot = fretFor(midi + shift);
		return spot ? [{ start, length, ...spot }] : [];
	});
	return { start: barStart, bars, length, meter, notes, played };
}

/**
 * The notes that start inside `ticks`, the last one cut to fit.
 * @param {import('../melody/roll/editNotes.js').DrawnNote[]} notes
 * @param {number} ticks
 */
export function keepWithin(notes, ticks) {
	return notes
		.filter((note) => note.start < ticks)
		.map((note) => ({ ...note, length: Math.min(note.length, ticks - note.start) }));
}

/**
 * The string and fret that play a pitch: the lowest fret, so the notes stay
 * near the nut (null: the neck doesn't reach it).
 * @param {number} midi
 * @returns {{ string: number, fret: number } | null}
 */
export function fretFor(midi) {
	let best = null;
	OPEN_MIDI.forEach((open, string) => {
		const fret = midi - open;
		if (fret < 0 || fret > MAX_FRET) return;
		if (!best || fret < best.fret) best = { string, fret };
	});
	return best;
}
