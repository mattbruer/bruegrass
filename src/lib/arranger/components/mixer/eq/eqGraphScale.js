/**
 * Where things sit on the EQ graph: frequency across (spaced like a piano,
 * each octave the same width, as in Logic), gain up and down.
 */
import { EQ_FREQUENCY_RANGE, EQ_GAIN_RANGE } from '../../../playback/eq/eqBands.js';

const LOG_SPAN = Math.log(EQ_FREQUENCY_RANGE.max / EQ_FREQUENCY_RANGE.min);

/** Frequencies marked on the grid. */
export const GRID_FREQUENCIES = Object.freeze([50, 100, 200, 500, 1000, 2000, 5000, 10000]);
/** Gains marked on the grid. */
export const GRID_GAINS = Object.freeze([-24, -12, 0, 12, 24]);

/**
 * @param {number} hz
 * @param {number} width
 */
export function xForFrequency(hz, width) {
	return (Math.log(hz / EQ_FREQUENCY_RANGE.min) / LOG_SPAN) * width;
}

/**
 * @param {number} x
 * @param {number} width
 */
export function frequencyAtX(x, width) {
	const across = Math.min(1, Math.max(0, x / width));
	return EQ_FREQUENCY_RANGE.min * Math.exp(across * LOG_SPAN);
}

/**
 * @param {number} db
 * @param {number} height
 */
export function yForGain(db, height) {
	const { min, max } = EQ_GAIN_RANGE;
	return ((max - db) / (max - min)) * height;
}

/**
 * @param {number} y
 * @param {number} height
 */
export function gainAtY(y, height) {
	const { min, max } = EQ_GAIN_RANGE;
	const db = max - (y / height) * (max - min);
	return Math.min(max, Math.max(min, db));
}

/**
 * Frequencies to work the curve out at: one per few pixels across.
 * @param {number} width
 */
export function curveFrequencies(width) {
	const points = Math.max(2, Math.ceil(width / 2));
	return Array.from({ length: points }, (_, i) => frequencyAtX((i / (points - 1)) * width, width));
}

/**
 * A frequency for people: "80 Hz", "2.5 kHz".
 * @param {number} hz
 */
export function formatFrequency(hz) {
	return hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz` : `${Math.round(hz)} Hz`;
}
