/**
 * The chart with a passing chord written into a bar: its beats get the new
 * chord, the rest keep theirs, and the bar is written in the fewest chords
 * that say so ("G,G,G,D7", or "G,D7" when it's half the bar), in place, so
 * everything else in the chart stays as typed.
 */
import { slotPositions } from './timeline.js';
import { withBarChords } from './withBarChords.js';
import { chartCell } from '../transcription/barChords.js';

/**
 * @param {string} text the chart
 * @param {import('./timeline.js').Section[]} sections read from it
 * @param {{ section: number, measure: number }} bar
 * @param {{ beat: number, beats: number, name: string }} passing
 */
export function withPassingChord(text, sections, bar, passing) {
	const slots = slotPositions(sections).filter(
		(slot) => slot.section === bar.section && slot.measure === bar.measure
	);
	if (slots.length === 0) return text;
	const perBeat = slots.flatMap((slot) => Array(slot.length).fill(slot.name));
	for (
		let beat = passing.beat;
		beat < passing.beat + passing.beats && beat < perBeat.length;
		beat++
	) {
		perBeat[beat] = passing.name;
	}
	return withBarChords(text, bar, chartCell(perBeat, perBeat[0]));
}
