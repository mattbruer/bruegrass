/**
 * How each EQ band control maps onto a slider (see Slider.svelte), spread
 * into a Slider: <Slider {...FREQUENCY_SCALE} ... />
 */
import { EQ_FREQUENCY_RANGE, EQ_GAIN_RANGE, EQ_Q_RANGE } from '../../../playback/eq/eqBands.js';
import { formatFrequency } from './eqGraphScale.js';

/**
 * A scale where each doubling gets the same travel (for frequency and Q).
 * @param {{ min: number, max: number }} range
 * @param {(value: number) => number} round
 * @param {(value: number) => string} format
 */
function logarithmicScale({ min, max }, round, format) {
	const span = Math.log(max / min);
	return Object.freeze({
		toPosition: (/** @type {number} */ value) => Math.log(value / min) / span,
		fromPosition: (/** @type {number} */ position) => round(min * Math.exp(position * span)),
		format
	});
}

export const FREQUENCY_SCALE = logarithmicScale(EQ_FREQUENCY_RANGE, Math.round, formatFrequency);

export const Q_SCALE = logarithmicScale(
	EQ_Q_RANGE,
	(q) => Math.round(q * 100) / 100,
	(q) => q.toFixed(2)
);

export const GAIN_SCALE = Object.freeze({
	toPosition: (/** @type {number} */ db) =>
		(db - EQ_GAIN_RANGE.min) / (EQ_GAIN_RANGE.max - EQ_GAIN_RANGE.min),
	fromPosition: (/** @type {number} */ position) =>
		Math.round((EQ_GAIN_RANGE.min + position * (EQ_GAIN_RANGE.max - EQ_GAIN_RANGE.min)) * 10) / 10,
	format: (/** @type {number} */ db) => `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`
});
