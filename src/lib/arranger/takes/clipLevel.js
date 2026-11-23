/**
 * "Even it out": the gain that brings a clip's loudest moment up (or down)
 * to just under full scale, like a DAW's Normalize.
 */
import { GAIN_RANGE } from './clips.js';

/** Where the loudest moment lands (dB below full scale), leaving a little room. */
const TARGET_PEAK_DB = -1;

/**
 * The loudest sample between two places in the audio.
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @param {number} from seconds
 * @param {number} to seconds
 */
export function peakIn(channels, sampleRate, from, to) {
	const first = Math.max(0, Math.floor(from * sampleRate));
	let peak = 0;
	for (const channel of channels) {
		const last = Math.min(channel.length, Math.ceil(to * sampleRate));
		for (let i = first; i < last; i++) peak = Math.max(peak, Math.abs(channel[i]));
	}
	return peak;
}

/**
 * @param {number} peak 0 to 1 (0: silence, left as it is)
 * @returns {number} dB
 */
export function evenedOutGain(peak) {
	if (peak <= 0) return 0;
	const gain = TARGET_PEAK_DB - 20 * Math.log10(peak);
	return Math.min(GAIN_RANGE.high, Math.max(GAIN_RANGE.low, Math.round(gain * 10) / 10));
}

/** @param {number} db */
export function dbToGain(db) {
	return 10 ** (db / 20);
}
