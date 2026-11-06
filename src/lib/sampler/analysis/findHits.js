/**
 * Every hit in a long recording (play a note as many times as you like,
 * then stop), and the stretch of audio around each one. Each stretch is
 * then analysed like a take of its own, so the same trim and checks apply;
 * the hits you choose are cut out and kept, the rest thrown away.
 *
 * Played to a click, the beat helps: once the clear hits show where the
 * beat falls, softer hits near a beat count too (a light graze right after
 * a loud one), and each hit's timing against the beat is measured.
 */
import { loudnessEnvelope, smoothEnvelope } from './envelope.js';
import { analyseTake } from './analyseTake.js';
import { beatPhase, offBeat } from './beatGrid.js';

/** Loudness is averaged over this long (ms), so a low E's own ripple isn't a new hit. */
const SMOOTHING_MS = 30;
/** A hit is a rise of this many dB above the quietest point since the last one… */
const RISE_DB = 6;
/** …to within this many dB of the loudest hit (a fret hand brushing a string isn't one)… */
const WITHIN_DB = 30;
/** …at least this long after the last (ms), so a pick's bounce isn't counted twice. */
const MIN_GAP_MS = 150;
/** Near a beat, a smaller rise is enough (dB)… */
const NEAR_BEAT_RISE_DB = 2;
/** …within this long of it (ms). */
const NEAR_BEAT_MS = 60;
/** Each stretch starts this long before its hit (ms): room for the trim to find the true onset. */
const PRE_ROLL_MS = 100;
/** A hit is heard up to this long (ms) after it starts (the smoothing's lag), so its onset is searched from here. */
const HEARD_LATE_MS = 40;
/** …and ends this long before the next hit is heard (ms), clear of its attack. */
const CLEAR_OF_NEXT_MS = 60;

/** @typedef {{ start: number, end: number }} FrameRange */

/**
 * Where each hit was heard, in frames. Rough (the smoothing makes it a few
 * ms late); the stretch's own analysis finds the exact onset.
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @param {number | null} [secondsPerBeat] the click's beat, when recorded to one
 * @returns {number[]}
 */
export function findHits(channels, sampleRate, secondsPerBeat = null) {
	const { db, frames } = loudnessEnvelope(channels, sampleRate);
	const windows = (/** @type {number} */ ms) =>
		Math.max(1, Math.round((sampleRate * ms) / 1000 / frames));
	const smoothed = smoothEnvelope(db, windows(SMOOTHING_MS));
	const peakDb = smoothed.reduce((loudest, level) => Math.max(loudest, level), -Infinity);
	if (!Number.isFinite(peakDb)) return [];

	const scan = (/** @type {number} */ riseDb) =>
		findRises(smoothed, peakDb - WITHIN_DB, riseDb, windows(MIN_GAP_MS)).map(
			(window) => window * frames
		);
	const clear = scan(RISE_DB);
	if (!secondsPerBeat || clear.length < 2) return clear;

	const beatFrames = secondsPerBeat * sampleRate;
	const phase = beatPhase(clear, beatFrames);
	const nearBeat = (sampleRate * NEAR_BEAT_MS) / 1000;
	const minGap = (sampleRate * MIN_GAP_MS) / 1000;
	const soft = scan(NEAR_BEAT_RISE_DB).filter(
		(hit) =>
			Math.abs(offBeat(hit, phase, beatFrames)) <= nearBeat &&
			clear.every((other) => Math.abs(other - hit) >= minGap)
	);
	return [...clear, ...soft].sort((a, b) => a - b);
}

/**
 * Windows where the loudness rises `riseDb` above the quietest point since
 * the last rise, to at least `loudEnough`.
 * @param {Float32Array} smoothed
 * @param {number} loudEnough
 * @param {number} riseDb
 * @param {number} minGap windows between rises
 */
function findRises(smoothed, loudEnough, riseDb, minGap) {
	// Silence is -Infinity dB: anything quieter counts as this, so noise isn't an infinite rise
	const floor = loudEnough - riseDb;
	/** @type {number[]} */
	const rises = [];
	let quietest = floor;
	let listeningFrom = 0;
	for (let window = 0; window < smoothed.length; window++) {
		if (window < listeningFrom) continue;
		const level = Math.max(smoothed[window], floor);
		quietest = Math.min(quietest, level);
		if (level >= loudEnough && level - quietest >= riseDb) {
			rises.push(window);
			quietest = Infinity;
			listeningFrom = window + minGap;
		}
	}
	return rises;
}

/**
 * The stretch of audio around each hit, from a little before it to just
 * before the next (the last runs to the end of the recording).
 * @param {number[]} hits frames
 * @param {number} length frames in the recording
 * @param {number} sampleRate
 * @returns {FrameRange[]}
 */
export function hitRanges(hits, length, sampleRate) {
	const toFrames = (/** @type {number} */ ms) => Math.round((sampleRate * ms) / 1000);
	return hits.map((hit, index) => ({
		start: Math.max(0, hit - toFrames(PRE_ROLL_MS)),
		end: index + 1 < hits.length ? hits[index + 1] - toFrames(CLEAR_OF_NEXT_MS) : length
	}));
}

/**
 * A stretch of a take, sharing its audio (nothing is copied).
 * @param {import('$lib/recording/takeRecorder.js').Take} take
 * @param {FrameRange} range
 */
export function viewOf(take, range) {
	return {
		channels: take.channels.map((channel) => channel.subarray(range.start, range.end)),
		sampleRate: take.sampleRate
	};
}

/**
 * A stretch of a take as audio of its own (a copy), to keep as a take.
 * @param {import('$lib/recording/takeRecorder.js').Take} take
 * @param {FrameRange} range
 */
export function cutOut(take, range) {
	return {
		channels: take.channels.map((channel) => channel.slice(range.start, range.end)),
		sampleRate: take.sampleRate
	};
}

/**
 * Every hit in a recording, each with its stretch, its own analysis (trim
 * and onset counted from the start of the stretch) and, when recorded to a
 * click, how early (−) or late (+) it was against the beat, in ms.
 * @param {import('$lib/recording/takeRecorder.js').Take} take
 * @param {number | null} midi the note asked for (null: a strum)
 * @param {number | null} [secondsPerBeat] the click's beat, when recorded to one
 */
export function analyseHits(take, midi, secondsPerBeat = null) {
	const { channels, sampleRate } = take;
	const hits = findHits(channels, sampleRate, secondsPerBeat);
	const ranges = hitRanges(hits, channels[0]?.length ?? 0, sampleRate);
	const lateBy = Math.round((sampleRate * HEARD_LATE_MS) / 1000);
	const analysed = ranges.map((range, index) => {
		const hitAfter = Math.max(0, hits[index] - lateBy - range.start);
		return { range, analysis: analyseTake(viewOf(take, range), midi, hitAfter) };
	});
	return withTiming(analysed, sampleRate, secondsPerBeat);
}

/**
 * Each hit's timing against the beat, from the exact onsets.
 * @param {{ range: FrameRange, analysis: import('./analyseTake.js').TakeAnalysis }[]} hits
 * @param {number} sampleRate
 * @param {number | null} secondsPerBeat
 */
function withTiming(hits, sampleRate, secondsPerBeat) {
	const onsets = hits.map(({ range, analysis }) => range.start + (analysis.onset ?? 0));
	if (!secondsPerBeat || hits.length < 2) return hits.map((hit) => ({ ...hit, offBeatMs: null }));
	const beatFrames = secondsPerBeat * sampleRate;
	const phase = beatPhase(onsets, beatFrames);
	return hits.map((hit, index) => ({
		...hit,
		offBeatMs: (offBeat(onsets[index], phase, beatFrames) / sampleRate) * 1000
	}));
}
