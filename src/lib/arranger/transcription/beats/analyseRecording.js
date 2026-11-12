/**
 * What the beat finder listens to, worked out once per recording, frame by
 * frame (short overlapping slices):
 *
 * - strength: how strongly something new starts (spectral flux on a log
 *   scale): picks, strums, chops and the bass all peak here.
 * - bass: the same for the low end alone, where the bass and the guitar's
 *   boom live. In bluegrass the boom falls on the beat and the chop between.
 * - chroma: how much of each of the 12 pitch classes is sounding, so the
 *   finder can see where the chords change (bars usually start there).
 */
import { createFft } from '../../../transcribe/stretch/fft.js';

const FRAME_SECONDS = 0.046;
const HOP_SECONDS = 0.0058;
/** How much the log scale lifts quiet sounds. */
const COMPRESSION = 1000;
/** Each flux is measured against its own average over this long, so loud passages don't swamp it. */
const AVERAGE_SECONDS = 0.5;
const BASS_TOP_HZ = 220;
const CHROMA_LOW_HZ = 65;
const CHROMA_HIGH_HZ = 2000;

/**
 * @typedef {{
 *   strength: Float32Array,
 *   bass: Float32Array,
 *   chroma: Float32Array,
 *   framesPerSecond: number,
 *   offsetSeconds: number
 * }} Analysis
 *   chroma: 12 values per frame, frame after frame; offsetSeconds: the time of frame 0's centre
 */

/**
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {Analysis}
 */
export function analyseRecording(channels, sampleRate) {
	const mono = mixDown(channels);
	const size = 2 ** Math.round(Math.log2(FRAME_SECONDS * sampleRate));
	const hop = Math.round(HOP_SECONDS * sampleRate);
	const fft = createFft(size);
	const window = hann(size);
	const frames = Math.max(0, Math.floor((mono.length - size) / hop) + 1);
	const bins = size / 2;
	const bassTop = Math.round((BASS_TOP_HZ * size) / sampleRate);
	const pitchClassOf = pitchClasses(size, sampleRate);

	const re = new Float64Array(size);
	const im = new Float64Array(size);
	let previous = new Float32Array(bins);
	let current = new Float32Array(bins);
	const flux = new Float32Array(frames);
	const bassFlux = new Float32Array(frames);
	const chroma = new Float32Array(frames * 12);

	for (let frame = 0; frame < frames; frame++) {
		const start = frame * hop;
		for (let i = 0; i < size; i++) {
			re[i] = mono[start + i] * window[i];
			im[i] = 0;
		}
		fft.forward(re, im);
		let rise = 0;
		let bassRise = 0;
		for (let bin = 1; bin < bins; bin++) {
			const magnitude = Math.hypot(re[bin], im[bin]);
			current[bin] = Math.log1p(COMPRESSION * magnitude);
			const change = frame > 0 ? Math.max(0, current[bin] - previous[bin]) : 0;
			rise += change;
			if (bin <= bassTop) bassRise += change;
			const pitchClass = pitchClassOf[bin];
			if (pitchClass >= 0) chroma[frame * 12 + pitchClass] += magnitude;
		}
		flux[frame] = rise;
		bassFlux[frame] = bassRise;
		[previous, current] = [current, previous];
	}

	const framesPerSecond = sampleRate / hop;
	const span = Math.round(AVERAGE_SECONDS * framesPerSecond);
	return {
		strength: normalise(aboveAverage(flux, span)),
		bass: normalise(aboveAverage(bassFlux, span)),
		chroma,
		framesPerSecond,
		offsetSeconds: size / 2 / sampleRate
	};
}

/**
 * The frame nearest a time.
 * @param {Analysis} analysis
 * @param {number} seconds
 */
export function frameAt(analysis, seconds) {
	return Math.round((seconds - analysis.offsetSeconds) * analysis.framesPerSecond);
}

/**
 * The time of a frame.
 * @param {Analysis} analysis
 * @param {number} frame
 */
export function secondsAt(analysis, frame) {
	return analysis.offsetSeconds + frame / analysis.framesPerSecond;
}

/** @param {Float32Array[]} channels */
function mixDown(channels) {
	if (channels.length === 1) return channels[0];
	const mono = new Float32Array(channels[0].length);
	for (const channel of channels) {
		for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
	}
	return mono;
}

/** @param {number} size */
function hann(size) {
	return Float64Array.from(
		{ length: size },
		(_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size)
	);
}

/**
 * Each FFT bin's pitch class (0 = C), or −1 outside the chroma range.
 * @param {number} size
 * @param {number} sampleRate
 */
function pitchClasses(size, sampleRate) {
	return Int8Array.from({ length: size / 2 }, (_, bin) => {
		const hz = (bin * sampleRate) / size;
		if (hz < CHROMA_LOW_HZ || hz > CHROMA_HIGH_HZ) return -1;
		const midi = Math.round(69 + 12 * Math.log2(hz / 440));
		return ((midi % 12) + 12) % 12;
	});
}

/**
 * How far each value rises above the average around it (never below 0).
 * @param {Float32Array} values
 * @param {number} span frames
 */
function aboveAverage(values, span) {
	const result = new Float32Array(values.length);
	const half = Math.max(1, span >> 1);
	let sum = 0;
	let from = 0;
	let to = 0;
	for (let i = 0; i < values.length; i++) {
		while (to < Math.min(values.length, i + half + 1)) sum += values[to++];
		while (from < i - half) sum -= values[from++];
		result[i] = Math.max(0, values[i] - sum / (to - from));
	}
	return result;
}

/**
 * Scaled so the spread is 1, whatever the recording's level.
 * @param {Float32Array} values
 */
function normalise(values) {
	let sum = 0;
	let squares = 0;
	for (const value of values) {
		sum += value;
		squares += value * value;
	}
	const mean = sum / (values.length || 1);
	const spread = Math.sqrt(squares / (values.length || 1) - mean * mean) || 1;
	return values.map((value) => value / spread);
}
