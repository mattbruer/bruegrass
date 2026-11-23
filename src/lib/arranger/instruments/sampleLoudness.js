/**
 * Sample sets are recorded at very different levels (FluidR3's notes sit
 * 15–20 dB below tonejs-instruments'), so each tune instrument is brought to
 * one loudness when its samples load.
 */
import { rmsLevel, toDecibels } from '../../audio/analysis/levels.js';

/** How loud a tune instrument's notes are made: a single guitar note measures about -10 (RMS over its first half second). */
export const TUNE_NOTE_LOUDNESS_DB = -10;
/** The part of a note that's measured: its attack and body, not the tail. */
const MEASURED_SECONDS = 0.5;

/**
 * The gain (dB) that brings these samples to TUNE_NOTE_LOUDNESS_DB, on average.
 * @param {import('tone').ToneAudioBuffer[]} buffers
 */
export function levelMatchDb(buffers) {
	const powers = buffers.map((buffer) => {
		const samples = buffer.getChannelData(0);
		const length = Math.min(samples.length, Math.round(MEASURED_SECONDS * buffer.sampleRate));
		return rmsLevel(samples.subarray(0, length)) ** 2;
	});
	const averagePower = powers.reduce((sum, power) => sum + power, 0) / powers.length;
	return TUNE_NOTE_LOUDNESS_DB - toDecibels(Math.sqrt(averagePower));
}
