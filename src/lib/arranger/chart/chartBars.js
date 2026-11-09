import { barQuarters, meterText, slotPositions } from './timeline.js';

/**
 * The arrangement as bars in play order, each with its chords and their
 * lengths in beats: what a chart draws (the scrolling strip, the lyric chart).
 *
 * @typedef {{ name: string, chord: number, length: number }} BarChord
 * @typedef {{
 *   index: number, section: number, measure: number, sectionName: string, sectionStart: boolean,
 *   meter: string | null, beats: number, start: number, chords: BarChord[]
 * }} ChartBar
 *   meter: shown at the first bar and wherever it changes;
 *   start and beats: when the bar plays, in quarter notes from bar 1
 *
 * @param {import('./timeline.js').Section[]} sections
 * @returns {ChartBar[]}
 */
export function barsInPlayOrder(sections) {
	/** @type {ChartBar[]} */
	const bars = [];
	let previousMeter = '';
	let previousSection = -1;
	for (const slot of slotPositions(sections)) {
		let bar = bars.at(-1);
		if (!bar || bar.section !== slot.section || bar.measure !== slot.measure) {
			const meter = meterText(slot.meter);
			bar = {
				index: bars.length,
				section: slot.section,
				measure: slot.measure,
				sectionName: slot.sectionName,
				sectionStart: slot.section !== previousSection,
				meter: bars.length === 0 || meter !== previousMeter ? meter : null,
				beats: barQuarters(slot.meter),
				start: slot.barStart,
				chords: []
			};
			bars.push(bar);
			previousMeter = meter;
			previousSection = slot.section;
		}
		bar.chords.push({ name: slot.name, chord: slot.chord, length: slot.length });
	}
	return bars;
}
