/**
 * Drawing the recording on the song's time: its waveform, bent so every
 * beat is the same width.
 */
import { secondsAtBeat } from './tempoMap.js';

/** How much of its lane's height a recording's loudest moment reaches (the rest is padding). */
export const WAVE_FILL = 0.92;

/** Columns per beat. */
const COLUMNS_PER_BEAT = 15;

/**
 * The waveform from one beat to another, bent so each beat is the same
 * width: the loudest moment in each column.
 * @param {Float32Array} peaks from waveformPeaks (or anything sampled evenly through the recording)
 * @param {number} peaksPerSecond
 * @param {number[]} beats
 * @param {number} from first beat
 * @param {number} to the beat it ends on
 * @param {number} [offset] the time of the first value
 * @returns {Float32Array} COLUMNS_PER_BEAT a beat
 */
export function bentWaveform(peaks, peaksPerSecond, beats, from, to, offset = 0) {
	const columns = new Float32Array(Math.max(0, Math.round((to - from) * COLUMNS_PER_BEAT)));
	for (let column = 0; column < columns.length; column++) {
		const start = secondsAtBeat(beats, from + column / COLUMNS_PER_BEAT);
		const end = secondsAtBeat(beats, from + (column + 1) / COLUMNS_PER_BEAT);
		columns[column] = loudest(
			peaks,
			(start - offset) * peaksPerSecond,
			(end - offset) * peaksPerSecond
		);
	}
	return columns;
}

/**
 * @param {Float32Array} peaks
 * @param {number} from
 * @param {number} to
 */
function loudest(peaks, from, to) {
	let peak = 0;
	const last = Math.min(peaks.length - 1, Math.ceil(to));
	for (let i = Math.max(0, Math.floor(from)); i <= last; i++) peak = Math.max(peak, peaks[i]);
	return peak;
}
