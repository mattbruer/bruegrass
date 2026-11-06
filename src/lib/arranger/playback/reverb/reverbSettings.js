/**
 * The reverb plugin's controls: their defaults, ranges and how they're
 * shown. The plugin window is built from REVERB_CONTROLS, so adding or
 * retuning a control happens here and nowhere else.
 */

/**
 * @typedef {{
 *   enabled: boolean,
 *   decay: number,
 *   preDelay: number,
 *   damping: number,
 *   width: number,
 *   lowCut: number,
 *   highCut: number,
 *   wet: number,
 *   dry: number
 * }} ReverbSettings
 *   enabled: off = bypassed (the bus passes its input through untouched)
 *   decay: seconds for the tail to fall away (60 dB)
 *   preDelay: ms of silence before the reverb starts (separates it from the note)
 *   damping: 0–100 %, how much faster high frequencies die than low ones
 *   width: 0–100 %, stereo spread (0 = mono)
 *   lowCut / highCut: Hz, filters on the reverb only (clear out mud, tame fizz)
 *   wet / dry: 0–100 %, reverb and untouched signal levels
 */

/** @type {Readonly<ReverbSettings>} */
export const REVERB_DEFAULTS = Object.freeze({
	enabled: true,
	decay: 2.5,
	preDelay: 20,
	damping: 50,
	width: 100,
	lowCut: 120,
	highCut: 8000,
	wet: 100, // an aux reverb is all reverb: the dry signal already reaches the master
	dry: 0
});

/**
 * @typedef {{
 *   key: Exclude<keyof ReverbSettings, 'enabled'>,
 *   name: string,
 *   min: number,
 *   max: number,
 *   scale: 'linear' | 'logarithmic',
 *   format: (value: number) => string
 * }} ReverbControl
 *   logarithmic: for frequencies, so each octave gets the same travel
 */

/** The plugin window's controls, in the order they're shown. */
export const REVERB_CONTROLS = /** @type {readonly ReverbControl[]} */ ([
	{
		key: 'decay',
		name: 'Decay',
		min: 0.3,
		max: 8,
		scale: 'linear',
		format: (s) => `${s.toFixed(1)} s`
	},
	{
		key: 'preDelay',
		name: 'Pre-delay',
		min: 0,
		max: 200,
		scale: 'linear',
		format: (ms) => `${Math.round(ms)} ms`
	},
	{ key: 'damping', name: 'Damping', min: 0, max: 100, scale: 'linear', format: percent },
	{ key: 'width', name: 'Width', min: 0, max: 100, scale: 'linear', format: percent },
	{ key: 'lowCut', name: 'Low cut', min: 20, max: 1000, scale: 'logarithmic', format: hertz },
	{ key: 'highCut', name: 'High cut', min: 1000, max: 20000, scale: 'logarithmic', format: hertz },
	{ key: 'wet', name: 'Wet', min: 0, max: 100, scale: 'linear', format: percent },
	{ key: 'dry', name: 'Dry', min: 0, max: 100, scale: 'linear', format: percent }
]);

/**
 * Where a value sits along its control, 0 (min) to 1 (max).
 * @param {ReverbControl} control
 * @param {number} value
 */
export function positionOf(control, value) {
	if (control.scale === 'logarithmic') {
		return Math.log(value / control.min) / Math.log(control.max / control.min);
	}
	return (value - control.min) / (control.max - control.min);
}

/**
 * The value at a position along a control (0–1), rounded sensibly.
 * @param {ReverbControl} control
 * @param {number} position
 */
export function valueAt(control, position) {
	const value =
		control.scale === 'logarithmic'
			? control.min * (control.max / control.min) ** position
			: control.min + position * (control.max - control.min);
	return roundForControl(control, value);
}

/** @param {ReverbControl} control @param {number} value */
function roundForControl(control, value) {
	if (control.key === 'decay') return Math.round(value * 10) / 10;
	if (control.scale === 'logarithmic') return Math.round(value / 10) * 10 || control.min;
	return Math.round(value);
}

/** @param {number} value */
function percent(value) {
	return `${Math.round(value)} %`;
}

/** @param {number} hz */
function hertz(hz) {
	return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
}
