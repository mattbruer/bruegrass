/**
 * How loud a block of audio samples is. Samples run from -1 to 1; 1 is
 * full scale (0 dBFS), the loudest a digital signal can be without clipping.
 */

/**
 * The biggest single sample: what tells you about clipping.
 * @param {Float32Array} samples
 */
export function peakLevel(samples) {
	let peak = 0;
	for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
	return peak;
}

/**
 * Root mean square: the average power, closer to how loud it *sounds*.
 * @param {Float32Array} samples
 */
export function rmsLevel(samples) {
	let sumOfSquares = 0;
	for (const sample of samples) sumOfSquares += sample * sample;
	return Math.sqrt(sumOfSquares / samples.length);
}

/**
 * A level (0–1+) in decibels relative to full scale: 1 → 0 dB, 0.5 → about -6 dB.
 * Silence is -Infinity.
 * @param {number} level
 */
export function toDecibels(level) {
	return level > 0 ? 20 * Math.log10(level) : -Infinity;
}

/**
 * How alike the left and right channels are: +1 identical (mono), 0
 * unrelated (wide), -1 opposite (out of phase: cancels out on a mono speaker).
 * @param {Float32Array} left
 * @param {Float32Array} right
 */
export function stereoCorrelation(left, right) {
	let together = 0;
	let leftPower = 0;
	let rightPower = 0;
	for (let i = 0; i < left.length; i++) {
		together += left[i] * right[i];
		leftPower += left[i] * left[i];
		rightPower += right[i] * right[i];
	}
	const bothPower = Math.sqrt(leftPower * rightPower);
	return bothPower > 0 ? together / bothPower : 0;
}
