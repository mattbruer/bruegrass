/**
 * How much of each of the 12 notes sounds over a stretch of a recording,
 * in one range of pitch (the bass, or the strum above it): what a chord
 * guess is made from. Measured at the recording's tuning, so a band tuned
 * 40 cents flat still lands on the right notes.
 */
import { createFft } from '../../../audio/stretch/fft.js';

/** The bass alone, in long frames to tell its low notes apart. */
export const BASS_HEARING = { frameSize: 16384, lowHz: 40, highHz: 200 };
/** The strum above the bass, in shorter frames that keep to the beat. */
export const STRUM_HEARING = { frameSize: 8192, lowHz: 200, highHz: 1500 };

/**
 * @typedef {{ frameSize: number, lowHz: number, highHz: number }} Hearing
 *   frameSize: longer tells low notes apart, shorter keeps to the beat
 * @typedef {{ notes: Float64Array, loudness: number }} NotesSounding
 *   notes: 12 values (0 = C); loudness: the stretch's RMS level
 */

/**
 * @param {Float32Array} mono
 * @param {number} sampleRate
 * @param {number} cents how far the band is from A = 440 (positive: sharp)
 * @param {Hearing} hearing
 */
export function createNoteMeter(mono, sampleRate, cents, { frameSize, lowHz, highHz }) {
	const fft = createFft(frameSize);
	const re = new Float64Array(frameSize);
	const im = new Float64Array(frameSize);
	const window = Float64Array.from(
		{ length: frameSize },
		(_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frameSize)
	);
	const noteOfBin = notesOfBins(frameSize, sampleRate, cents, lowHz, highHz);

	/**
	 * @param {number} start seconds
	 * @param {number} end seconds
	 * @returns {NotesSounding}
	 */
	return function notesBetween(start, end) {
		const notes = new Float64Array(12);
		let power = 0;
		let samples = 0;
		for (const from of frameStarts(start, end, sampleRate, frameSize, mono.length)) {
			for (let i = 0; i < frameSize; i++) {
				const sample = mono[from + i] ?? 0;
				power += sample * sample;
				re[i] = sample * window[i];
				im[i] = 0;
			}
			samples += frameSize;
			fft.forward(re, im);
			for (let bin = 1; bin < noteOfBin.length; bin++) {
				const note = noteOfBin[bin];
				if (note >= 0) notes[note] += Math.sqrt(Math.hypot(re[bin], im[bin]));
			}
		}
		return { notes, loudness: samples ? Math.sqrt(power / samples) : 0 };
	};
}

/**
 * Where the frames start for a stretch: half-overlapping, at least one,
 * centred on a stretch shorter than a frame.
 * @param {number} start seconds
 * @param {number} end seconds
 * @param {number} sampleRate
 * @param {number} frameSize
 * @param {number} length samples in the recording
 */
function frameStarts(start, end, sampleRate, frameSize, length) {
	const first = Math.round(start * sampleRate);
	const last = Math.min(length, Math.round(end * sampleRate)) - frameSize;
	if (last < first) {
		const centre = Math.round(((start + end) / 2) * sampleRate);
		return [Math.max(0, centre - frameSize / 2)];
	}
	const starts = [];
	for (let at = first; at <= last; at += frameSize / 2) starts.push(at);
	return starts;
}

/**
 * Each FFT bin's note (0 = C), or −1 outside the range.
 * @param {number} frameSize
 * @param {number} sampleRate
 * @param {number} cents
 * @param {number} lowHz
 * @param {number} highHz
 */
function notesOfBins(frameSize, sampleRate, cents, lowHz, highHz) {
	const top = Math.ceil((highHz * frameSize) / sampleRate);
	return Int8Array.from({ length: top + 1 }, (_, bin) => {
		const hz = (bin * sampleRate) / frameSize;
		if (hz < lowHz || hz > highHz) return -1;
		const midi = Math.round(69 + 12 * Math.log2(hz / 440) - cents / 100);
		return ((midi % 12) + 12) % 12;
	});
}
