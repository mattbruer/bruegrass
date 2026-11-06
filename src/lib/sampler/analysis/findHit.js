/**
 * Where the hit is in a take: when the pick lands (the onset), where the
 * sound has died away, and how much noise sits around it. From these the
 * sample is trimmed: a few ms of lead-in before the onset, so the pick's
 * very first edge survives, and a short tail after the ring.
 */
import { loudnessEnvelope } from './envelope.js';

/** Kept before the onset, in ms: enough for the pick's first edge, too little to hear as a gap. */
export const LEAD_IN_MS = 5;
/** Kept after the sound falls below the end level, in ms. */
const TAIL_MS = 30;
/** The onset is the first moment within this many dB of the peak… */
const ONSET_BELOW_PEAK_DB = 30;
/** …and at least this far above the room's noise. */
const ONSET_ABOVE_NOISE_DB = 12;
/** The sound has ended when it stays this far below the peak… */
const END_BELOW_PEAK_DB = 60;
/** …or within this much of the noise, whichever comes first. */
const END_ABOVE_NOISE_DB = 6;
/**
 * The room's noise is measured before the hit, if there's at least this
 * much (ms) of it; otherwise it's unknown. (The quiet end of a take is no
 * good: there the guitar is usually still ringing.)
 */
const NOISE_NEEDS_MS = 50;

/**
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {{
 *   onset: number | null,
 *   trim: { start: number, end: number },
 *   peakDb: number,
 *   noiseDb: number | null,
 *   envelope: { db: Float32Array, frames: number }
 * }} frames (onset, trim) and dBFS levels
 */
export function findHit(channels, sampleRate) {
	const envelope = loudnessEnvelope(channels, sampleRate);
	const { db, frames } = envelope;
	const length = channels[0]?.length ?? 0;
	const peakDb = db.reduce((loudest, level) => Math.max(loudest, level), -Infinity);
	// First find the hit by the peak alone, then measure the noise before it, then refine
	const firstGuess = db.findIndex((level) => level >= peakDb - ONSET_BELOW_PEAK_DB);
	const quietWindows = Math.max(
		0,
		firstGuess - Math.ceil((sampleRate * LEAD_IN_MS) / 1000 / frames)
	);
	const noiseDb =
		quietWindows * frames >= (sampleRate * NOISE_NEEDS_MS) / 1000
			? median(db.subarray(0, quietWindows))
			: null;
	const floorDb = noiseDb ?? -Infinity;

	const onsetLevel = Math.max(peakDb - ONSET_BELOW_PEAK_DB, floorDb + ONSET_ABOVE_NOISE_DB);
	const onsetWindow = db.findIndex((level) => level >= onsetLevel);
	if (onsetWindow < 0 || !Number.isFinite(peakDb)) {
		return { onset: null, trim: { start: 0, end: length }, peakDb, noiseDb, envelope };
	}

	const endLevel = Math.max(peakDb - END_BELOW_PEAK_DB, floorDb + END_ABOVE_NOISE_DB);
	let lastLoud = onsetWindow;
	for (let window = db.length - 1; window > onsetWindow; window--) {
		if (db[window] >= endLevel) {
			lastLoud = window;
			break;
		}
	}

	const onset = onsetWindow * frames;
	const toFrames = (/** @type {number} */ ms) => Math.round((sampleRate * ms) / 1000);
	return {
		onset,
		trim: {
			start: Math.max(0, onset - toFrames(LEAD_IN_MS)),
			end: Math.min(length, (lastLoud + 1) * frames + toFrames(TAIL_MS))
		},
		peakDb,
		noiseDb,
		envelope
	};
}

/**
 * The middle value (digital silence, -Infinity dB, counts as the quietest).
 * @param {Float32Array} values
 */
function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}
