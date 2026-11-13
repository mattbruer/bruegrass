/**
 * The count you hear over the recording: a click on the beats the time
 * signature counts (2/2: ONE and TWO), a higher one on each bar's ONE, so
 * you can hear whether the grid fits the song.
 */

/**
 * @param {{ firstBeat: number, beats: number }[]} bars
 * @param {number} index a beat of the grid
 * @param {number} perBar beats in a bar, for the beats before bar 1
 * @returns {number | null} the beat's place in its bar (null: after the last bar)
 */
function positionInBar(bars, index, perBar) {
	const first = bars[0]?.firstBeat ?? 0;
	if (index < first) return (((index - first) % perBar) + perBar) % perBar;
	const bar = bars.findLast((each) => each.firstBeat <= index);
	return bar && index < bar.firstBeat + bar.beats ? index - bar.firstBeat : null;
}

/**
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {number[]} clickBeats the beats of a bar to click on (timeSignatures.js)
 * @returns {{ times: number[], accents: boolean[] }}
 */
export function gridClicks(grid, bars, clickBeats) {
	const perBar = bars[0]?.beats ?? 4;
	/** @type {{ times: number[], accents: boolean[] }} */
	const clicks = { times: [], accents: [] };
	grid.beats.forEach((time, index) => {
		const position = positionInBar(bars, index, perBar);
		if (position === null || !clickBeats.includes(position)) return;
		clicks.times.push(time);
		clicks.accents.push(position === 0);
	});
	return clicks;
}
