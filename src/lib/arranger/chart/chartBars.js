import { barQuarters, meterText, slotPositions } from './timeline.js';

/**
 * The arrangement as bars in play order, each with its chords and their
 * lengths in beats: what a chart draws (the scrolling strip, the lyric chart).
 *
 * @typedef {{ name: string, chord: number, length: number, key: import('./key.js').Key | null }} BarChord
 *   key: the key a [K:] named for it (null: the song's)
 * @typedef {{
 *   index: number, section: number, measure: number, sectionName: string, sectionStart: boolean,
 *   meter: string | null, beats: number, start: number, chords: BarChord[], held: boolean
 * }} ChartBar
 *   meter: shown at the first bar and wherever it changes;
 *   start and beats: when the bar plays, in quarter notes from bar 1;
 *   held: left empty in the chart, so it holds the chord before and is
 *   drawn without a chord name (never the first bar: that one names its chord)
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
				chords: [],
				held: bars.length > 0 && (sections[slot.section].held?.[slot.measure] ?? false)
			};
			bars.push(bar);
			previousMeter = meter;
			previousSection = slot.section;
		}
		bar.chords.push({ name: slot.name, chord: slot.chord, length: slot.length, key: slot.key });
	}
	return bars;
}

/**
 * The index of the bar playing at a time (-1: none, or stopped).
 * @param {{ start: number, beats: number }[]} bars in play order
 * @param {number} time quarter notes from bar 1, NaN when stopped
 */
export function barPlayingAt(bars, time) {
	if (!Number.isFinite(time)) return -1;
	return bars.findIndex((bar) => time >= bar.start && time < bar.start + bar.beats);
}
