/**
 * The chart with a chord put on a spot (chordSpot.js): from its beat up to
 * the bar's next chord, the rest of the bar keeping its own. The bar is
 * written in the fewest chords that say so ("G,Em" for the second half),
 * in place, so everything else in the chart stays as typed. A bar that
 * held the chord before gets its chords written in.
 */
import { slotPositions } from './timeline.js';
import { withBarChords } from './withBarChords.js';
import { chartCell } from '../transcription/barChords.js';

/**
 * @param {string} text the chart
 * @param {import('./timeline.js').Section[]} sections read from it
 * @param {import('./chordSpot.js').ChordSpot} spot
 * @param {string} name
 */
export function withChordFrom(text, sections, spot, name) {
	const all = slotPositions(sections);
	const first = all.find((slot) => slot.section === spot.section && slot.measure === spot.measure);
	if (!first) return text;
	const bar = all.filter((slot) => slot.bar === first.bar);
	const perBeat = bar.flatMap((slot) => Array(slot.length).fill(slot.name));
	const startsLater = bar
		.map((slot) => slot.start - slot.barStart)
		.filter((beat) => beat > spot.beat);
	const end = Math.min(perBeat.length, ...startsLater);
	for (let beat = spot.beat; beat < end; beat++) perBeat[beat] = name;
	return withBarChords(text, spot, chartCell(perBeat, perBeat[0]));
}
