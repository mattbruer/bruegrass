/**
 * A recording on a grid: its beats (seconds into the recording, found by
 * beats/detectBeats.js or fixed by hand) and where the bars fall on them
 * (barPlan.js). Beats needn't be evenly spaced, so the grid follows a
 * song that speeds up or drags. Plain data, so it can be kept as a draft,
 * saved or sent.
 *
 * Every edit returns a new grid.
 */
import { evenBarPlan, withBarStartingAt, withBeatCountChanged } from './barPlan.js';

/**
 * @typedef {{ beats: number[], bars: import('./barPlan.js').BarPlan }} BeatGrid
 */

/** Beats closer than this are one beat. */
const MIN_BEAT_GAP_SECONDS = 0.08;

/**
 * @param {number[]} beats seconds, in order
 * @param {number} beatsPerBar
 * @param {number} [firstBeat] the beat bar 1 starts on
 * @returns {BeatGrid}
 */
export function newBeatGrid(beats, beatsPerBar, firstBeat = 0) {
	return { beats, bars: evenBarPlan(beatsPerBar, firstBeat) };
}

/**
 * A beat moved to a new time, kept between its neighbours.
 * @param {BeatGrid} grid
 * @param {number} index
 * @param {number} seconds
 * @returns {BeatGrid}
 */
export function withBeatMoved(grid, index, seconds) {
	const earliest = (grid.beats[index - 1] ?? -Infinity) + MIN_BEAT_GAP_SECONDS;
	const latest = (grid.beats[index + 1] ?? Infinity) - MIN_BEAT_GAP_SECONDS;
	const moved = Math.max(0, Math.min(latest, Math.max(earliest, seconds)));
	return { ...grid, beats: grid.beats.with(index, Math.round(moved * 1000) / 1000) };
}

/**
 * The beat nearest a time, or -1 when there are none.
 * @param {number[]} beats
 * @param {number} seconds
 */
export function nearestBeat(beats, seconds) {
	let best = -1;
	for (let i = 0; i < beats.length; i++) {
		if (best === -1 || Math.abs(beats[i] - seconds) < Math.abs(beats[best] - seconds)) best = i;
	}
	return best;
}

/**
 * @param {BeatGrid} grid
 * @param {number} beat
 * @returns {BeatGrid}
 */
export function withOneAt(grid, beat) {
	return { ...grid, bars: withBarStartingAt(grid.bars, grid.beats.length, beat) };
}

/**
 * A beat the finder missed. Returns the grid unchanged if one is already there.
 * @param {BeatGrid} grid
 * @param {number} seconds
 * @returns {BeatGrid}
 */
export function withBeatAdded(grid, seconds) {
	const near = nearestBeat(grid.beats, seconds);
	if (near !== -1 && Math.abs(grid.beats[near] - seconds) < MIN_BEAT_GAP_SECONDS) return grid;
	const index = grid.beats.findIndex((beat) => beat > seconds);
	const at = index === -1 ? grid.beats.length : index;
	const beats = grid.beats.toSpliced(at, 0, seconds);
	return { beats, bars: withBeatCountChanged(grid.bars, at, 1) };
}

/**
 * A beat the finder heard that isn't there.
 * @param {BeatGrid} grid
 * @param {number} index
 * @returns {BeatGrid}
 */
export function withBeatRemoved(grid, index) {
	return {
		beats: grid.beats.toSpliced(index, 1),
		bars: withBeatCountChanged(grid.bars, index, -1)
	};
}

/**
 * Twice as many beats: one halfway between each pair. For when the finder
 * counted every other beat. Bar 1 stays on its beat; bars keep their beats per bar.
 * @param {BeatGrid} grid
 * @returns {BeatGrid}
 */
export function withBeatsDoubled(grid) {
	const beats = grid.beats.flatMap((beat, i) => {
		const next = grid.beats[i + 1];
		return next === undefined ? [beat] : [beat, (beat + next) / 2];
	});
	return { beats, bars: { ...grid.bars, firstBeat: grid.bars.firstBeat * 2, lengths: {} } };
}

/**
 * Half as many beats: every other one, keeping bar 1's. For when the finder
 * counted twice as fast as the song.
 * @param {BeatGrid} grid
 * @returns {BeatGrid}
 */
export function withBeatsHalved(grid) {
	const keep = grid.bars.firstBeat % 2;
	const beats = grid.beats.filter((_, i) => i % 2 === keep);
	return {
		beats,
		bars: { ...grid.bars, firstBeat: Math.floor(grid.bars.firstBeat / 2), lengths: {} }
	};
}

/**
 * The song's tempo around a beat, from the beats either side (beats per minute).
 * @param {number[]} beats
 * @param {number} index
 */
export function tempoAt(beats, index) {
	const from = Math.max(0, index - 2);
	const to = Math.min(beats.length - 1, index + 2);
	if (to <= from) return 0;
	return (60 * (to - from)) / (beats[to] - beats[from]);
}
