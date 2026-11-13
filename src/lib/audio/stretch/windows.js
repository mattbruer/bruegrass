/**
 * The analysis window and the two helper windows that measure, for every
 * frequency bin, how fast its phase turns (its exact frequency) and when in
 * the frame its energy sits (so a pick attack stays an attack).
 *
 * All three are indexed 0..size-1 with the frame's centre at size/2.
 * @param {number} size
 */
export function createWindows(size) {
	const window = new Float64Array(size);
	const derivative = new Float64Array(size);
	const timesTime = new Float64Array(size);

	for (let k = 0; k < size; k++) {
		const angle = (2 * Math.PI * k) / size;
		window[k] = 0.5 - 0.5 * Math.cos(angle);
		derivative[k] = (Math.PI / size) * Math.sin(angle);
		timesTime[k] = (k - size / 2) * window[k];
	}

	return { window, derivative, timesTime };
}

/**
 * What overlapping Hann windows (applied twice: analysis and synthesis) add
 * up to at every sample, so the output can be divided by it.
 * @param {number} size
 * @param {number} hop
 */
export function overlapGain(size, hop) {
	return (3 * size) / (8 * hop);
}
