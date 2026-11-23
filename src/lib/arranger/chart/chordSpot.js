/**
 * A spot in the chart: a bar and a beat in it. A chord can be put there
 * whether or not one is written there now (a bar holding the chord before,
 * the second half of a bar). A written chord's place is the spot it starts on.
 */
import { slotPositions } from './timeline.js';

const EPSILON = 1e-6;

/**
 * @typedef {{ section: number, measure: number, beat: number }} ChordSpot beat: 0 = beat 1
 * @typedef {{ slot: number, start: number, length: number }} SpotSpan one time the spot plays:
 *   the chord sounding there (index into the slots) and the time until the bar's next chord
 */

/**
 * The spot a written chord starts on.
 * @param {import('./timeline.js').Section[]} sections
 * @param {import('./chartAnalysis.js').ChordPlace} place
 * @returns {ChordSpot | null}
 */
export function spotOfPlace(sections, place) {
	const slot = slotPositions(sections).find(
		(each) =>
			each.section === place.section && each.measure === place.measure && each.chord === place.chord
	);
	return slot
		? { section: place.section, measure: place.measure, beat: slot.start - slot.barStart }
		: null;
}

/**
 * Every time the spot plays: from its beat until the bar's next chord, or the bar's end.
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {ChordSpot} spot
 * @returns {SpotSpan[]}
 */
export function spansOf(slots, spot) {
	/** @type {SpotSpan[]} */
	const spans = [];
	slots.forEach((slot, index) => {
		if (slot.section !== spot.section || slot.measure !== spot.measure) return;
		const start = slot.barStart + spot.beat;
		if (start < slot.start - EPSILON || start >= slot.start + slot.length - EPSILON) return;
		const barEnd = slot.barStart + barLength(slots, index);
		const nextInBar = slots
			.slice(index + 1)
			.find((later) => later.bar === slot.bar && later.start > start + EPSILON);
		spans.push({ slot: index, start, length: (nextInBar?.start ?? barEnd) - start });
	});
	return spans;
}

/**
 * @param {import('./timeline.js').SlotPosition[]} slots
 * @param {number} index
 */
function barLength(slots, index) {
	const { bar, barStart } = slots[index];
	const last = slots.findLast((slot) => slot.bar === bar);
	return last ? last.start + last.length - barStart : 0;
}
