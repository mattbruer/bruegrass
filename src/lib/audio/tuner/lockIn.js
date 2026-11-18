/**
 * The string's phase against a steady reference at the note's own
 * frequency (a lock-in, the way a strobe tuner works): one DFT bin at
 * exactly that frequency, timed by the sample clock. In tune, the phase
 * stands still; off by a few cents, it turns at the difference in Hz.
 *
 * The window is a whole number of the note's periods, Hann shaped, so its
 * nulls fall on the note's other partials and keep them out.
 */

/**
 * The window for measuring a note and its partials: a whole number of the
 * note's periods (so it has nulls on every partial), at least `periods`
 * and at least `minSeconds` long.
 * @param {number} hz
 * @param {number} sampleRate
 * @param {{ periods: number, minSeconds: number }} shape
 */
export function lockInWindow(hz, sampleRate, { periods, minSeconds }) {
	const wholePeriods = Math.max(periods, Math.ceil(minSeconds * hz));
	const length = Math.round((wholePeriods * sampleRate) / hz);
	const window = new Float64Array(length);
	for (let i = 0; i < length; i++)
		window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / length);
	return window;
}

/**
 * The phase (radians) and strength of `hz` in the newest samples.
 * @param {Float32Array} ring the latest samples, round and round
 * @param {number} written how many samples have ever been written (the clock)
 * @param {Float64Array} window
 * @param {number} hz
 * @param {number} sampleRate
 */
export function measurePhase(ring, written, window, hz, sampleRate) {
	const length = window.length;
	const mask = ring.length - 1;
	const first = written - length;
	const cyclesPerSample = hz / sampleRate;

	// The reference's angle at the window's first sample, kept small so it stays exact
	const turns = (cyclesPerSample * first) % 1;
	let cos = Math.cos(-2 * Math.PI * turns);
	let sin = Math.sin(-2 * Math.PI * turns);
	const stepCos = Math.cos(-2 * Math.PI * cyclesPerSample);
	const stepSin = Math.sin(-2 * Math.PI * cyclesPerSample);

	let re = 0;
	let im = 0;
	for (let i = 0; i < length; i++) {
		const x = ring[(first + i) & mask] * window[i];
		re += x * cos;
		im += x * sin;
		const nextCos = cos * stepCos - sin * stepSin;
		sin = cos * stepSin + sin * stepCos;
		cos = nextCos;
	}
	return { phase: Math.atan2(im, re), strength: re * re + im * im };
}
