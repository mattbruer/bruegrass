/**
 * A recording on a grid, like an audio region on Logic's ruler: its beats
 * (seconds into the recording, found by beats/detectBeats.js or fixed by
 * hand), where the bars fall on them (barPlan.js), and the stretch of the
 * recording that's used (its trim). Beats needn't be evenly spaced, so the
 * grid follows a song that speeds up or drags. Plain data, so it can be
 * kept as a draft, saved or sent.
 *
 * Sliding the recording along the ruler is moving bar 1 to another beat
 * (withSlide): the beats belong to the recording and go with it. Bar 1 may
 * start before the first beat found (a pickup at the very start), so a
 * beat's time is always read through beatSeconds, which carries the beats on.
 *
 * Every edit returns a new grid.
 */
import { evenBarPlan, layOutBars, withBarStartingAt, withBeatCountChanged } from './barPlan.js';
import { secondsAtBeat } from './tempoMap.js';

/**
 * @typedef {{ from: number, to: number }} Trim the stretch of the recording used, in seconds
 * @typedef {{ beats: number[], bars: import('./barPlan.js').BarPlan, trim: Trim }} BeatGrid
 */

/** Beats closer than this are one beat. */
const MIN_BEAT_GAP_SECONDS = 0.08;
/** The shortest a trimmed recording can be. */
const MIN_TRIMMED_SECONDS = 1;
/** Bar 1 can start at most this many bars before the first beat found. */
const MOST_BARS_BEFORE = 4;

/**
 * @param {number[]} beats seconds, in order
 * @param {number} beatsPerBar
 * @param {number} firstBeat the beat bar 1 starts on
 * @param {Trim} trim
 * @returns {BeatGrid}
 */
export function newBeatGrid(beats, beatsPerBar, firstBeat, trim) {
	return { beats, bars: evenBarPlan(beatsPerBar, firstBeat), trim };
}

/**
 * A beat's time, also for beats before the first one found or after the
 * last (the gap beside them carries on).
 * @param {BeatGrid} grid
 * @param {number} index
 */
export function beatSeconds(grid, index) {
	return secondsAtBeat(grid.beats, index);
}

/**
 * The bars, up to the end of the trimmed recording.
 * @param {BeatGrid} grid
 */
export function gridBars(grid) {
	const end = grid.beats.findIndex((beat) => beat >= grid.trim.to);
	return layOutBars(end === -1 ? grid.beats.length : end, grid.bars);
}

/**
 * The recording slid along the ruler by whole beats (later when positive):
 * bar 1 moves onto another of its beats, and every bar with it.
 * @param {BeatGrid} grid
 * @param {number} beats
 * @returns {BeatGrid}
 */
export function withSlide(grid, beats) {
	const earliest = -MOST_BARS_BEFORE * grid.bars.beatsPerBar;
	const firstBeat = Math.max(
		earliest,
		Math.min(grid.beats.length - 1, grid.bars.firstBeat - Math.round(beats))
	);
	return { ...grid, bars: { ...grid.bars, firstBeat } };
}

/**
 * The recording trimmed to a stretch, kept within it and at least a second long.
 * @param {BeatGrid} grid
 * @param {Trim} trim
 * @param {number} duration the whole recording's length
 * @returns {BeatGrid}
 */
export function withTrim(grid, { from, to }, duration) {
	const start = Math.max(0, Math.min(from, duration - MIN_TRIMMED_SECONDS));
	const end = Math.min(duration, Math.max(to, start + MIN_TRIMMED_SECONDS));
	return { ...grid, trim: { from: roundToMs(start), to: roundToMs(end) } };
}

/** @param {number} seconds */
function roundToMs(seconds) {
	return Math.round(seconds * 1000) / 1000;
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
	return { ...grid, beats, bars: withBeatCountChanged(grid.bars, at, 1) };
}

/**
 * A beat the finder heard that isn't there.
 * @param {BeatGrid} grid
 * @param {number} index
 * @returns {BeatGrid}
 */
export function withBeatRemoved(grid, index) {
	return {
		...grid,
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
	return {
		...grid,
		beats,
		bars: { ...grid.bars, firstBeat: grid.bars.firstBeat * 2, lengths: {} }
	};
}

/**
 * Half as many beats: every other one, keeping bar 1's. For when the finder
 * counted twice as fast as the song.
 * @param {BeatGrid} grid
 * @returns {BeatGrid}
 */
export function withBeatsHalved(grid) {
	const keep = ((grid.bars.firstBeat % 2) + 2) % 2;
	const beats = grid.beats.filter((_, i) => i % 2 === keep);
	return {
		...grid,
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
