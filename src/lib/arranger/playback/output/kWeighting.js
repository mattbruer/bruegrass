/**
 * K-weighting (ITU-R BS.1770): the filter in front of a loudness meter, so
 * it hears roughly the way we do. Two stages:
 *
 *   1. a high shelf, +4 dB above ~1.7 kHz (the head's effect on what reaches the ear)
 *   2. a low cut around 38 Hz (we hear deep bass as quieter than its power suggests)
 *
 * The standard gives coefficients only for 48 kHz; these are worked out
 * from the same analogue design for any sample rate (the method libebur128
 * uses), so the meter is right at 44.1 kHz too. They feed native
 * IIRFilterNodes, which take coefficients directly.
 *
 * @typedef {{ feedforward: number[], feedback: number[] }} IirCoefficients
 */

const SHELF = { frequency: 1681.974450955533, gainDb: 3.999843853973347, q: 0.7071752369554196 };
const LOW_CUT = { frequency: 38.13547087602444, q: 0.5003270373238773 };

/**
 * @param {number} sampleRate
 * @returns {IirCoefficients}
 */
export function kWeightingShelf(sampleRate) {
	const k = Math.tan((Math.PI * SHELF.frequency) / sampleRate);
	const vh = 10 ** (SHELF.gainDb / 20);
	const vb = vh ** 0.4996667741545416;
	const a0 = 1 + k / SHELF.q + k * k;
	return {
		feedforward: [
			(vh + (vb * k) / SHELF.q + k * k) / a0,
			(2 * (k * k - vh)) / a0,
			(vh - (vb * k) / SHELF.q + k * k) / a0
		],
		feedback: [1, (2 * (k * k - 1)) / a0, (1 - k / SHELF.q + k * k) / a0]
	};
}

/**
 * @param {number} sampleRate
 * @returns {IirCoefficients}
 */
export function kWeightingLowCut(sampleRate) {
	const k = Math.tan((Math.PI * LOW_CUT.frequency) / sampleRate);
	const a0 = 1 + k / LOW_CUT.q + k * k;
	return {
		feedforward: [1, -2, 1],
		feedback: [1, (2 * (k * k - 1)) / a0, (1 - k / LOW_CUT.q + k * k) / a0]
	};
}
