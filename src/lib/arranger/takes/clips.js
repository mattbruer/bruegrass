/**
 * An audio lane's clips: each one a window onto a take, where it plays on
 * the song, how loud, and how it fades. Editing never touches the take's
 * audio: a clip says which part of it plays, so every edit can be undone
 * and a take can always be used whole again.
 *
 * A clip sits where its take was recorded (the take's start, with its
 * latency and by-ear nudge) moved by its own `shift`, so comping a part of
 * another take keeps it in time with the band.
 *
 * Times are seconds: `from` and `to` into the take; places on the song are
 * seconds from bar 1.
 */
import { takeStart } from './takeTiming.js';

/**
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {{
 *   takeId: string,
 *   from: number,
 *   to: number,
 *   shift: number,
 *   gain: number,
 *   fadeIn: number,
 *   fadeOut: number
 * }} AudioClip
 *   from, to: the part of the take that plays (seconds into it); shift: moved from
 *   where it was recorded (seconds); gain: dB; fadeIn, fadeOut: seconds
 * @typedef {Record<string, AudioClip[]>} EditedLanes
 *   the clips of each audio lane you've edited, by record track; one not here plays its take in use whole
 */

/** Shorter than this (seconds) and it's too small to see or grab. */
export const SHORTEST_CLIP = 0.05;
/** Every edge fades this long (seconds) at least, so a cut never clicks. */
export const EDGE_FADE = 0.008;
/** How far a clip's level goes, in dB. */
export const GAIN_RANGE = { low: -24, high: 12 };

/** @param {TakeDocument} take */
export function wholeTake(take) {
	return { takeId: take.id, from: 0, to: take.seconds, shift: 0, gain: 0, fadeIn: 0, fadeOut: 0 };
}

/**
 * What a lane plays: your clips once you've edited it, else its take in
 * use, whole. A clip of a deleted take is left out.
 * @param {string} trackId
 * @param {EditedLanes} edited
 * @param {TakeDocument[]} takes every take of the song
 * @returns {{ clip: AudioClip, take: TakeDocument }[]}
 */
export function clipsOfTrack(trackId, edited, takes) {
	const onTrack = takes.filter((take) => take.trackId === trackId);
	const saved = edited[trackId] ?? wholeTakeInUse(onTrack);
	return saved.flatMap((clip) => {
		const take = onTrack.find((each) => each.id === clip.takeId);
		return take ? [{ clip, take }] : [];
	});
}

/** @param {TakeDocument[]} onTrack */
function wholeTakeInUse(onTrack) {
	const inUse = onTrack.find((take) => take.inUse);
	return inUse ? [wholeTake(inUse)] : [];
}

/**
 * Where the clip starts on the song (seconds from bar 1).
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 */
export function clipStart(clip, take) {
	return takeStart(take) + clip.shift + clip.from;
}

/** @param {AudioClip} clip */
export function clipLength(clip) {
	return clip.to - clip.from;
}

/**
 * Cut in two at a place on the song (null: it isn't far enough inside).
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 * @param {number} at seconds from bar 1
 * @returns {[AudioClip, AudioClip] | null}
 */
export function splitClip(clip, take, at) {
	const into = at - clipStart(clip, take);
	if (into < SHORTEST_CLIP || clipLength(clip) - into < SHORTEST_CLIP) return null;
	const cut = clip.from + into;
	return [
		{ ...clip, to: cut, fadeOut: 0, fadeIn: Math.min(clip.fadeIn, into) },
		{ ...clip, from: cut, fadeIn: 0, fadeOut: Math.min(clip.fadeOut, clip.to - cut) }
	];
}

/**
 * Cut at each of these places, in order: a clip split at every section, say.
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 * @param {number[]} places seconds from bar 1
 * @returns {AudioClip[]}
 */
export function splitClipAt(clip, take, places) {
	const pieces = [clip];
	for (const at of [...places].sort((a, b) => a - b)) {
		const last = /** @type {AudioClip} */ (pieces.pop());
		pieces.push(...(splitClip(last, take, at) ?? [last]));
	}
	return pieces;
}

/**
 * Its start trimmed to a place on the song; the sound stays where it is.
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 * @param {number} at seconds from bar 1
 */
export function withStartAt(clip, take, at) {
	const from = clamp(at - takeStart(take) - clip.shift, 0, clip.to - SHORTEST_CLIP);
	return fitFades({ ...clip, from });
}

/**
 * Its end trimmed to a place on the song.
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 * @param {number} at seconds from bar 1
 */
export function withEndAt(clip, take, at) {
	const to = clamp(at - takeStart(take) - clip.shift, clip.from + SHORTEST_CLIP, take.seconds);
	return fitFades({ ...clip, to });
}

/**
 * @param {AudioClip} clip
 * @param {number} seconds later (negative: earlier)
 */
export function movedBy(clip, seconds) {
	return { ...clip, shift: clip.shift + seconds };
}

/**
 * The same stretch of the song from another take (comping: the best verse
 * from one take, the chorus from another), in time with the band as that
 * take was recorded. Null when the other take doesn't cover any of it.
 * @param {AudioClip} clip
 * @param {TakeDocument} take
 * @param {TakeDocument} other
 * @returns {AudioClip | null}
 */
export function fromTake(clip, take, other) {
	const offset = takeStart(take) - takeStart(other);
	const from = Math.max(0, clip.from + offset);
	const to = Math.min(other.seconds, clip.to + offset);
	if (to - from < SHORTEST_CLIP) return null;
	return fitFades({ ...clip, takeId: other.id, from, to });
}

/**
 * @param {AudioClip} clip
 * @param {number} gain dB
 */
export function withGain(clip, gain) {
	return { ...clip, gain: clamp(gain, GAIN_RANGE.low, GAIN_RANGE.high) };
}

/**
 * @param {AudioClip} clip
 * @param {{ fadeIn?: number, fadeOut?: number }} fades seconds
 */
export function withFades(clip, { fadeIn = clip.fadeIn, fadeOut = clip.fadeOut }) {
	const length = clipLength(clip);
	const fadeInFits = clamp(fadeIn, 0, length);
	return { ...clip, fadeIn: fadeInFits, fadeOut: clamp(fadeOut, 0, length - fadeInFits) };
}

/**
 * Fades never longer than the clip together.
 * @param {AudioClip} clip
 */
function fitFades(clip) {
	const length = clipLength(clip);
	const fadeIn = Math.min(clip.fadeIn, length);
	return { ...clip, fadeIn, fadeOut: Math.min(clip.fadeOut, length - fadeIn) };
}

/**
 * @param {number} value
 * @param {number} low
 * @param {number} high
 */
function clamp(value, low, high) {
	return Math.min(high, Math.max(low, value));
}
