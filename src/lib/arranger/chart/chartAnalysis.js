/**
 * The chart's chords analysed by function (theory/analyzeProgression.js),
 * in play order through the whole song, with your own marks
 * (analysisMarks.js) kept beside each worked-out reading.
 */
import { slotPositions } from './timeline.js';
import { analyzeProgression } from '../theory/analyzeProgression.js';
import { withoutVariant } from '../instruments/chordBook.js';

/**
 * @typedef {{ section: number, measure: number, chord: number }} ChordPlace
 *   where a chord is written: section index, bar in it, chord in the bar
 * @typedef {import('../theory/analyzeProgression.js').Reading & { mark: string | null, name: string, key: import('./key.js').Key }} ChordAnalysis
 *   mark: your own reading, shown instead of label when there is one; key: the key it's read in
 */

/** @param {ChordPlace} place */
export function placeId({ section, measure, chord }) {
	return `${section}:${measure}:${chord}`;
}

/**
 * @param {(import('./timeline.js').Section & { marks?: (string | null)[][] })[]} sections
 * @param {import('./key.js').Key | null} key the song's (each chord is read in its own, `keyOfChord`)
 * @returns {Map<string, ChordAnalysis>} by placeId
 */
export function chartAnalysis(sections, key) {
	/** @type {Map<string, ChordAnalysis>} */
	const byPlace = new Map();
	if (!key) return byPlace;
	const slots = slotPositions(sections);
	const keys = slots.map((slot) => slot.key ?? key);
	const readings = analyzeProgression(
		slots.map((slot) => withoutVariant(slot.name)),
		keys
	);
	slots.forEach((slot, i) => {
		const reading = readings[i];
		if (!reading) return;
		const mark = sections[slot.section].marks?.[slot.measure]?.[slot.chord] ?? null;
		byPlace.set(placeId(slot), { ...reading, mark, name: slot.name, key: keys[i] });
	});
	return byPlace;
}

/**
 * A chord's function on its own, where there's no chart place to look it up
 * (the piano roll's chords): no neighbours, so no resolution to go on.
 * @param {string} name
 * @param {import('./key.js').Key | null} key
 */
export function functionOnItsOwn(name, key) {
	if (!key) return name;
	return analyzeProgression([withoutVariant(name)], key)[0]?.label ?? name;
}
