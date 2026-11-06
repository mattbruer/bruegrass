/**
 * How mixer values map onto sliders (see Slider.svelte). Spread into a
 * Slider: <Slider {...LEVEL_SCALE} ... />
 * (Resetting a control puts it back to its default in mixer.svelte.js.)
 */
import { UNITY, dbToFader, faderToDb, formatDb } from '../../playback/faderTaper.js';

/** Faders and part levels: the console fader taper. */
export const LEVEL_SCALE = Object.freeze({
	toPosition: dbToFader,
	fromPosition: faderToDb,
	format: formatDb
});

/**
 * Reverb sends: just "how much", from none (left) to the most (right), with
 * no number shown. Underneath it's the fader taper up to unity (0 dB), so
 * the send feels like the faders: most of the travel is the useful range.
 */
export const SEND_SCALE = Object.freeze({
	toPosition: (/** @type {number} */ db) => dbToFader(db) / UNITY,
	fromPosition: (/** @type {number} */ position) => faderToDb(position * UNITY),
	/** For screen readers (the readout isn't shown) */
	format: (/** @type {number} */ db) => `${Math.round((dbToFader(db) / UNITY) * 100)}% to reverb`
});

/** Within this of the centre, the pan clicks onto it (like a centre-detented pan pot). */
const PAN_CENTRE_DETENT = 0.04;

/** Pan: -1 (left) to 1 (right), shown as L50 / C / R30. */
export const PAN_SCALE = Object.freeze({
	toPosition: (/** @type {number} */ pan) => (pan + 1) / 2,
	fromPosition: (/** @type {number} */ position) => {
		const pan = Math.round((position * 2 - 1) * 100) / 100;
		return Math.abs(pan) < PAN_CENTRE_DETENT ? 0 : pan;
	},
	format: (/** @type {number} */ pan) => {
		if (Math.abs(pan) < 0.01) return 'C';
		return `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;
	}
});
