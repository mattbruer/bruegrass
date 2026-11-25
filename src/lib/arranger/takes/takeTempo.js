/**
 * Takes follow the tempo. A take keeps its own times (where it starts,
 * its clips' edges, moves and fades: seconds at the tempo it was recorded
 * at), and plays stretched to the song's tempo now, its pitch kept. This is
 * the one place that turns one into the other.
 *
 * The tempo lane bends a song by shares of its tempo, so with the same
 * tempo lane every place on the song moves by the same factor: a take
 * recorded at 120 is twice as long at 60. (A tempo lane drawn after
 * recording isn't followed: the take keeps the bends it was recorded with.)
 */

/**
 * How much longer the take lasts now than as recorded: 2 at half its tempo.
 * @param {{ bpm: number }} take
 * @param {number} bpm the song's tempo now
 */
export function stretchOf(take, bpm) {
	return take.bpm / bpm;
}

/**
 * A take's time (seconds at its own tempo) as song time now.
 * @param {number} seconds
 * @param {{ bpm: number }} take
 * @param {number} bpm
 */
export function songTime(seconds, take, bpm) {
	return seconds * stretchOf(take, bpm);
}

/**
 * Song time now as the take's time.
 * @param {number} seconds
 * @param {{ bpm: number }} take
 * @param {number} bpm
 */
export function takeTime(seconds, take, bpm) {
	return seconds / stretchOf(take, bpm);
}
