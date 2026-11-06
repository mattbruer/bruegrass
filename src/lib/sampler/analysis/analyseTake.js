/**
 * Everything the session measures about a take, once, right after it's
 * recorded. Plain numbers, saved with the take, so the checks and the
 * export never need the audio again to know where the hit is.
 */
import { peakLevel, toDecibels } from '$lib/arranger/playback/analysis/levels.js';
import { findHit, LEAD_IN_MS } from './findHit.js';
import { smoothEnvelope } from './envelope.js';
import { detectPitch, centsOff, midiToHz } from './detectPitch.js';

/** Brightness is measured over this much of the hit (ms): the pick's attack, what the ear notices most. */
const BRIGHTNESS_MS = 100;
/** A second hit is a rise of this many dB after the sound has started falling… */
const SECOND_HIT_RISE_DB = 6;
/** …in a loudness averaged over this long (ms): over two cycles of a low E, so its own ripple isn't a rise. */
const SECOND_HIT_SMOOTHING_MS = 30;
/** …at least this long after the first (ms), so the pick's own bounce doesn't count. */
const SECOND_HIT_AFTER_MS = 60;
/** A second hit must come within this many dB of the first: a fret hand brushing a string in the noise isn't one. */
const SECOND_HIT_WITHIN_DB = 30;
/** "Still ringing when stopped" looks at the last this-many ms. */
const ENDING_MS = 50;

/**
 * @typedef {{
 *   trim: { start: number, end: number },
 *   onset: number | null,
 *   peaksDb: number[],
 *   peakDb: number,
 *   noiseDb: number | null,
 *   beforeHitDb: number,
 *   endingDb: number,
 *   brightness: number | null,
 *   hz: number | null,
 *   cents: number | null,
 *   secondHitSeconds: number | null,
 *   startedLate: boolean
 * }} TakeAnalysis
 *   Levels in dBFS, except beforeHitDb and endingDb, which are relative to
 *   the peak. trim and onset in frames. noiseDb: null when there was no
 *   quiet before the hit to measure. startedLate: the hit is so close to
 *   the start that its lead-in is cut short.
 */

/**
 * @param {import('$lib/recording/takeRecorder.js').Take} take
 * @param {number | null} midi the note asked for (null: a strum)
 * @param {number | null} [hitAfter] frames: the hit comes after this (see findHit)
 * @returns {TakeAnalysis}
 */
export function analyseTake(take, midi, hitAfter = null) {
	const { channels, sampleRate } = take;
	const hit = findHit(channels, sampleRate, hitAfter);
	const { db, frames } = hit.envelope;
	const ms = (/** @type {number} */ value) => Math.round((sampleRate * value) / 1000);
	const onsetWindow = hit.onset === null ? 0 : Math.floor(hit.onset / frames);

	// Loudest moment before the hit (squeaks, a breath, the pick touching the string)
	const quietUntil = Math.max(0, onsetWindow - Math.ceil(ms(10) / frames));
	const beforeHitDb = maxOf(db, 0, quietUntil) - hit.peakDb;
	const startedLate = hit.onset !== null && hit.onset < ms(LEAD_IN_MS);
	const endingDb = maxOf(db, db.length - Math.ceil(ms(ENDING_MS) / frames), db.length) - hit.peakDb;

	const hz =
		midi !== null && hit.onset !== null
			? detectPitch(channels[0], sampleRate, hit.onset, midiToHz(midi))
			: null;

	const secondHit =
		hit.onset === null
			? null
			: findSecondHit(
					smoothEnvelope(db, Math.round(ms(SECOND_HIT_SMOOTHING_MS) / frames)),
					hit.peakDb,
					onsetWindow,
					ms(SECOND_HIT_AFTER_MS) / frames
				);

	return {
		trim: hit.trim,
		onset: hit.onset,
		peaksDb: channels.map((channel) => toDecibels(peakLevel(channel))),
		peakDb: hit.peakDb,
		noiseDb: hit.noiseDb,
		beforeHitDb,
		endingDb,
		brightness: hit.onset === null ? null : brightness(channels[0], hit.onset, ms(BRIGHTNESS_MS)),
		hz,
		cents: hz !== null && midi !== null ? centsOff(hz, midiToHz(midi)) : null,
		secondHitSeconds: secondHit === null ? null : (secondHit * frames) / sampleRate,
		startedLate
	};
}

/**
 * How bright the attack is: the level of the wave's sample-to-sample change
 * against the level of the wave. High frequencies change fast, so a bright
 * pick scores higher. Only meaningful compared with takes of the same note.
 * @param {Float32Array} samples
 * @param {number} from
 * @param {number} length
 */
function brightness(samples, from, length) {
	const to = Math.min(samples.length, from + length);
	let change = 0;
	let level = 0;
	for (let i = from + 1; i < to; i++) {
		const delta = samples[i] - samples[i - 1];
		change += delta * delta;
		level += samples[i] * samples[i];
	}
	return level > 0 ? Math.sqrt(change / level) : null;
}

/**
 * A second pick after the sound started dying away: the envelope climbs
 * well above the quietest point since the first hit.
 * @param {Float32Array} db envelope
 * @param {number} peakDb
 * @param {number} onsetWindow
 * @param {number} minWindows how long after the onset to start looking
 * @returns {number | null} windows after the first hit
 */
function findSecondHit(db, peakDb, onsetWindow, minWindows) {
	const loudEnough = peakDb - SECOND_HIT_WITHIN_DB;
	// Silence is -Infinity dB: count anything quieter than this as this, so any noise isn't an infinite rise
	const floor = loudEnough - SECOND_HIT_RISE_DB;
	let quietest = Infinity;
	for (let window = onsetWindow + Math.ceil(minWindows); window < db.length; window++) {
		const level = Math.max(db[window], floor);
		quietest = Math.min(quietest, level);
		if (level >= loudEnough && level - quietest >= SECOND_HIT_RISE_DB) return window - onsetWindow;
	}
	return null;
}

/**
 * @param {Float32Array} values
 * @param {number} from
 * @param {number} to
 */
function maxOf(values, from, to) {
	let max = -Infinity;
	for (let i = Math.max(0, from); i < Math.min(values.length, to); i++)
		max = Math.max(max, values[i]);
	return max;
}
