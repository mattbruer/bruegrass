/**
 * The Channel EQ's bands, modelled on Logic's: a low cut and a high cut at
 * the ends, a shelf inside each, and four bell-shaped bands in the middle.
 * Every strip's EQ (channels, reverb aux, master) uses these.
 *
 * Add, remove or retune a band here; the audio, the graph and the controls
 * all follow this list.
 */

/**
 * @typedef {'lowCut' | 'lowShelf' | 'bell1' | 'bell2' | 'bell3' | 'bell4' | 'highShelf' | 'highCut'} BandId
 * @typedef {'highpass' | 'lowshelf' | 'peaking' | 'highshelf' | 'lowpass'} BandShape
 *   the Web Audio BiquadFilterNode type that makes it
 * @typedef {{ id: BandId, on: boolean, frequency: number, gain: number, q: number, slope: number }} BandSettings
 *   frequency: Hz; gain: dB (shelves and bells); q: width (bells; higher = narrower);
 *   slope: dB per octave (cuts: 12 or 24)
 * @typedef {{ enabled: boolean, bands: BandSettings[] }} EqSettings
 *   enabled: off = bypassed
 * @typedef {{ id: BandId, name: string, shape: BandShape, defaults: Omit<BandSettings, 'id'> }} BandDefinition
 */

/* Ranges for the controls */
export const EQ_FREQUENCY_RANGE = Object.freeze({ min: 20, max: 20000 });
export const EQ_GAIN_RANGE = Object.freeze({ min: -24, max: 24 });
export const EQ_Q_RANGE = Object.freeze({ min: 0.1, max: 12 });
/** Steepness choices for the cuts, in dB per octave (each 12 is one filter stage). */
export const CUT_SLOPES = Object.freeze([12, 24]);

/** @type {readonly BandDefinition[]} */
export const EQ_BANDS = Object.freeze([
	band('lowCut', 'Low Cut', 'highpass', { on: false, frequency: 80 }),
	band('lowShelf', 'Low Shelf', 'lowshelf', { frequency: 100 }),
	band('bell1', 'Low Mid', 'peaking', { frequency: 250 }),
	band('bell2', 'Mid', 'peaking', { frequency: 800 }),
	band('bell3', 'High Mid', 'peaking', { frequency: 2500 }),
	band('bell4', 'Presence', 'peaking', { frequency: 6000 }),
	band('highShelf', 'High Shelf', 'highshelf', { frequency: 10000 }),
	band('highCut', 'High Cut', 'lowpass', { on: false, frequency: 17000 })
]);

/**
 * @param {BandId} id
 * @param {string} name
 * @param {BandShape} shape
 * @param {Partial<BandSettings>} overrides
 * @returns {BandDefinition}
 */
function band(id, name, shape, overrides) {
	return {
		id,
		name,
		shape,
		defaults: { on: true, frequency: 1000, gain: 0, q: 1, slope: 12, ...overrides }
	};
}

/** A flat EQ (changes nothing until you move something), switched on. */
export function flatEq() {
	return {
		enabled: true,
		bands: EQ_BANDS.map((definition) => ({ id: definition.id, ...definition.defaults }))
	};
}

/**
 * @param {BandId} id
 */
export function bandDefinition(id) {
	const definition = EQ_BANDS.find((each) => each.id === id);
	if (!definition) throw new Error(`No EQ band: ${id}`);
	return definition;
}

/**
 * Is this band a cut (low or high), with a slope instead of a gain?
 * @param {BandShape} shape
 */
export function isCut(shape) {
	return shape === 'highpass' || shape === 'lowpass';
}

/**
 * Does this band have a width (Q) to adjust? Only the bells: Web Audio's
 * shelves have a fixed slope, and the cuts here are always smooth (Butterworth).
 * @param {BandShape} shape
 */
export function hasWidth(shape) {
	return shape === 'peaking';
}
