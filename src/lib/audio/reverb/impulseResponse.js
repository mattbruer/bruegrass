/**
 * A reverb's "impulse response": the sound of a room after a single click.
 * Convolving any sound with it makes that sound ring in the room.
 *
 * Real rooms' tails are dense, random reflections that die away, highs
 * faster than lows. So the tail is built from noise:
 *   - shaped by a decay envelope (down 60 dB after `decay` seconds),
 *   - darkened as it goes, by a filter that closes over time (`damping`),
 *   - with left and right made from separate noise, mixed to set `width`.
 *
 * Pure maths: it returns sample arrays, so it can be tested anywhere.
 */

/* Shaping */
const EXTRA_TAIL_SECONDS = 0.2; // a little past the decay time, so it ends in silence
const FADE_IN_SECONDS = 0.004; // no click at the start
const BRIGHTEST_HZ = 16000; // the tail starts this bright...
const DARKEST_HZ = 400; // ...and full damping closes it to this by the end of the decay
const SIXTY_DB = 3; // in powers of ten: the classic RT60 "decay time" is a 60 dB fall

/**
 * @param {{ sampleRate: number, decay: number, damping: number, width: number }} options
 *   decay: seconds; damping and width: 0–100 (%)
 * @returns {{ left: Float32Array, right: Float32Array }}
 */
export function impulseResponse({ sampleRate, decay, damping, width }) {
	const length = Math.ceil(sampleRate * (decay + EXTRA_TAIL_SECONDS));
	const left = new Float32Array(length);
	const right = new Float32Array(length);

	const dampingAmount = damping / 100;
	const spread = width / 100;
	let filteredLeft = 0;
	let filteredRight = 0;

	for (let i = 0; i < length; i++) {
		const seconds = i / sampleRate;
		const loudness = 10 ** ((-SIXTY_DB * seconds) / decay) * Math.min(1, seconds / FADE_IN_SECONDS);

		// One-pole low-pass on each side, closing as the tail goes on
		const cutoff = tailBrightness(seconds / decay, dampingAmount);
		const smoothing = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
		filteredLeft += smoothing * (randomNoise() - filteredLeft);
		filteredRight += smoothing * (randomNoise() - filteredRight);

		// Width: the shared (mid) part, plus as much of the difference (side) as asked for
		const mid = (filteredLeft + filteredRight) / 2;
		const side = ((filteredLeft - filteredRight) / 2) * spread;
		left[i] = loudness * (mid + side);
		right[i] = loudness * (mid - side);
	}

	return { left, right };
}

/**
 * How bright the tail is at a point through it: starts at BRIGHTEST_HZ and
 * glides down (more with more damping) towards DARKEST_HZ.
 * @param {number} progress 0 at the start, 1 at the decay time
 * @param {number} dampingAmount 0–1
 */
function tailBrightness(progress, dampingAmount) {
	return BRIGHTEST_HZ * (DARKEST_HZ / BRIGHTEST_HZ) ** (Math.min(1, progress) * dampingAmount);
}

function randomNoise() {
	return Math.random() * 2 - 1;
}
