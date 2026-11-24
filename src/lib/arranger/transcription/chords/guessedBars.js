/**
 * Which bars' chords are still the guess. Each guessed bar is remembered as
 * the chart read it back just after guessing; once its chords differ (you
 * changed them, in the grid or the chart's text) the bar is yours.
 */

/** @typedef {import('../barChords.js').Slots} Slots */

/**
 * @param {Record<number, Slots>} guessed bar number → its chords as guessed
 * @param {Record<number, Slots>} chords bar number → its chords now
 * @returns {number[]}
 */
export function barsStillGuessed(guessed, chords) {
	return Object.keys(guessed)
		.map(Number)
		.filter((number) => sameSlots(guessed[number], chords[number]));
}

/**
 * @param {Slots} a
 * @param {Slots | undefined} b
 */
function sameSlots(a, b) {
	return !!b && a.length === b.length && a.every((slot, i) => slot === b[i]);
}
