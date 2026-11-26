/**
 * A fill: a few notes you write for one chord, played where the band's
 * strum would have been. It sits at the end of the chord (a fill leads into
 * what comes next) and lasts 1 or more bars, up to the chord's own length.
 * Saved with the chord's changes (guitarEdits.js) as plain data:
 * `{ bars, notes }`, each note's `start` and `length` in ticks from the
 * fill's start (ticks.js) and `midi` the pitch as it sounds on the neck
 * without the capo, the way a TAB reads, so the capo moves it like the
 * rest of the guitar.
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

/**
 * How many bars of fill fit in a chord (0: the chord is shorter than a bar).
 * @param {number} chordLength quarters
 * @param {import('../chart/timeline.js').Meter} meter
 */
export function barsThatFit(chordLength, meter) {
	return Math.floor(chordLength / barQuarters(meter) + 1e-6);
}

/**
 * Where a chord's fill is in the song: its last bars (null: no room for one).
 * @param {Fill | undefined} fill
 * @param {{ start: number, length: number, meter: import('../chart/timeline.js').Meter }} chord
 * @returns {FillSpan | null}
 */
export function fillSpan(fill, chord) {
	const room = barsThatFit(chord.length, chord.meter);
	if (!fill || room === 0) return null;
	const bars = Math.min(Math.max(fill.bars, 1), room);
	const length = bars * barQuarters(chord.meter);
	const notes = keepWithin(fill.notes, length * TICKS_PER_QUARTER);
	const played = notes.flatMap(({ midi, start, length }) => {
		const spot = fretFor(midi);
		return spot ? [{ start, length, ...spot }] : [];
	});
	return {
		start: chord.start + chord.length - length,
		bars,
		length,
		meter: chord.meter,
		notes,
		played
	};
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
