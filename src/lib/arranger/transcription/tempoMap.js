/**
 * The recording's tempo map: its beats (seconds, which may drift) against
 * the song's time in quarter notes from bar 1, like Logic's "Apply Region
 * Tempo to Project Tempo". Every beat the recording has is a quarter of the
 * song, and bar 1 starts on the bar plan's first beat; the beats before it
 * are a lead-in at negative quarters.
 */

/**
 * The song's time (quarters from bar 1) at a moment of the recording.
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {number} seconds
 */
export function quartersAt(grid, seconds) {
	return beatPosition(grid.beats, seconds) - grid.bars.firstBeat;
}

/**
 * The moment of the recording at a time in the song (quarters from bar 1).
 * @param {import('./beatGrid.js').BeatGrid} grid
 * @param {number} quarters
 */
export function secondsAt(grid, quarters) {
	return secondsAtBeat(grid.beats, quarters + grid.bars.firstBeat);
}

/**
 * Where a moment of the recording falls in beats (2.5 = halfway from beat 2
 * to beat 3). Before the first beat and after the last, the nearest gap carries on.
 * @param {number[]} beats
 * @param {number} seconds
 */
export function beatPosition(beats, seconds) {
	if (beats.length < 2) return 0;
	let i = beats.findIndex((beat) => beat > seconds) - 1;
	if (i === -2) i = beats.length - 2;
	i = Math.max(0, Math.min(beats.length - 2, i));
	return i + (seconds - beats[i]) / (beats[i + 1] - beats[i]);
}

/**
 * The moment of the recording at a beat position (the reverse of beatPosition).
 * @param {number[]} beats
 * @param {number} position
 */
export function secondsAtBeat(beats, position) {
	if (beats.length < 2) return beats[0] ?? 0;
	const i = Math.max(0, Math.min(beats.length - 2, Math.floor(position)));
	return beats[i] + (position - i) * (beats[i + 1] - beats[i]);
}
