/**
 * Voice leading: from one chord to the next, move to the nearest voicing,
 * so no voice jumps, while staying low on the neck. Works on pitches only,
 * so any instrument's voicings can be led.
 */

/** What a semitone of movement costs, from the last chord's notes to the next's. */
const MOVE_COST = 1;
/** What a semitone higher costs (the voicing's average), so the chops don't creep up the neck. */
const HEIGHT_COST = 2;

/**
 * How high a voicing sits: its notes on average, then its top note.
 * @param {number[]} pitches
 */
export function register(pitches) {
	const average = pitches.reduce((total, pitch) => total + pitch, 0) / pitches.length;
	return average + Math.max(...pitches) / 100;
}

/**
 * How far one voicing's notes move to reach another's: each note to the
 * nearest note of the other chord, both ways, so a note that appears or
 * disappears counts too.
 * @param {number[]} from
 * @param {number[]} to
 */
export function movement(from, to) {
	const nearest = (/** @type {number} */ pitch, /** @type {number[]} */ others) =>
		Math.min(...others.map((other) => Math.abs(other - pitch)));
	const sum = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
		a.reduce((total, pitch) => total + nearest(pitch, b), 0);
	return sum(from, to) + sum(to, from);
}

/**
 * The voicing to play next: the lowest, or with a chord before it, the one
 * that balances moving least against staying low.
 * @template {{ pitches: number[] }} V
 * @param {V[]} choices
 * @param {V | null} previous
 * @returns {V}
 */
export function nextVoicing(choices, previous) {
	const cost = (/** @type {V} */ voicing) =>
		HEIGHT_COST * register(voicing.pitches) +
		(previous ? MOVE_COST * movement(previous.pitches, voicing.pitches) : 0);
	return choices.reduce((best, voicing) => (cost(voicing) < cost(best) ? voicing : best));
}
