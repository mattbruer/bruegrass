/**
 * Where a take sits on the song: plain maths, no audio.
 *
 * Song time is seconds from bar 1 (negative before it). A take starts at
 * `startsAt` plus its by-ear `nudgeMs`, at the tempo it was recorded at.
 *
 * Every take file (downloaded or added) starts exactly one bar before bar 1:
 * the count-in bar, where a pickup is sung. That holds whatever the melody
 * does, so a file made on one device lines up on another.
 */
import { DEFAULT_METER, barQuarters, slotPositions } from '../chart/timeline.js';

/**
 * @typedef {{ startsAt: number, nudgeMs: number, seconds: number }} Placed
 *   seconds: how long the take is
 * @typedef {{ at: number, offset: number, duration: number }} Slice
 *   at: when it starts, in seconds from the pass's bar 1 (negative: in the
 *   lead-in, like a pickup); offset: how far into the take; duration: how much
 */

/** @param {Placed} take seconds from bar 1 */
export function takeStart(take) {
	return take.startsAt + take.nudgeMs / 1000;
}

/**
 * The part of a take one pass of playback plays: the pass runs from
 * `regionStart` (song seconds) for `passLength`. A pass from the top also
 * plays what's before bar 1 (the count-in bar: a sung pickup), and does
 * again at the end of every later pass, as the melody's pickup does.
 * @param {Placed} take
 * @param {{ regionStart: number, passLength: number }} pass
 * @returns {Slice | null} null when none of it falls in the pass
 */
export function sliceForPass(take, { regionStart, passLength }) {
	const start = takeStart(take);
	const from = regionStart === 0 ? start : Math.max(start, regionStart);
	const until = Math.min(start + take.seconds, regionStart + passLength);
	if (until <= from) return null;
	return { at: from - regionStart, offset: from - start, duration: until - from };
}

/**
 * A take's audio as a file that starts one bar before bar 1: cut or padded
 * with silence at the front.
 * @param {Placed & { channels: Float32Array[], sampleRate: number }} take
 * @param {number} barSeconds the length of bar 1
 * @returns {Float32Array[]}
 */
export function audioFromCountIn(take, barSeconds) {
	const skip = Math.round((-barSeconds - takeStart(take)) * take.sampleRate);
	return take.channels.map((channel) => {
		if (skip >= 0) return channel.slice(skip);
		const padded = new Float32Array(channel.length - skip);
		padded.set(channel, -skip);
		return padded;
	});
}

/**
 * Where a file that starts one bar before bar 1 sits.
 * @param {number} barSeconds the length of bar 1
 */
export function countInStart(barSeconds) {
	return -barSeconds;
}

/**
 * How long bar 1 of these sections is, in seconds.
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {number} bpm
 */
export function firstBar(sections, bpm) {
	const meter = slotPositions(sections)[0]?.meter ?? DEFAULT_METER;
	const quarters = barQuarters(meter);
	return { seconds: (quarters * 60) / bpm, quarters };
}
