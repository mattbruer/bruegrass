/**
 * Each take's waveform path, worked out once from its audio and kept in
 * memory for the life of the page (a take's audio never changes).
 */
import { readTakeAudio } from '$lib/storage/songTakes.js';
import { waveformPath, waveformPeaks } from '../takes/waveformPeaks.js';

/** @type {Map<string, Promise<string>>} */
const paths = new Map();

/**
 * @param {import('$lib/storage/songTakes.js').TakeDocument} take
 * @returns {Promise<string>} empty when its audio is gone
 */
export function takeWaveform(take) {
	let path = paths.get(take.id);
	if (!path) {
		path = readTakeAudio(take.id).then((channels) =>
			channels ? waveformPath(waveformPeaks(channels, take.sampleRate)) : ''
		);
		paths.set(take.id, path);
	}
	return path;
}
