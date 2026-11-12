/**
 * The count you hear over the recording: a click on every beat, a higher
 * one on each bar's ONE, so you can hear whether the grid fits the song.
 */

/**
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {import('./barPlan.js').Bar[]} bars
 * @returns {{ times: number[], accents: boolean[] }}
 */
export function gridClicks(grid, bars) {
	const ones = new Set(bars.map((bar) => bar.firstBeat));
	return {
		times: grid.beats,
		accents: grid.beats.map((_, i) => ones.has(i))
	};
}
