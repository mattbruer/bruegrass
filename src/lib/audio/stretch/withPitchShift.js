/**
 * A stretcher that can also move the song's pitch a little (fine tuning, in
 * cents), keeping its speed: the stretcher plays it at speed ÷ ratio, and
 * the result is read back `ratio` times as fast (4-point interpolation).
 * At 0 cents the samples pass through untouched.
 *
 * Plain code like the stretcher: the AudioWorklet runs it live, Node tests it.
 */

/** Samples asked of the stretcher at a time. */
const CHUNK = 64;

/** @param {ReturnType<typeof import('./stretcher.js').createStretcher>} stretcher */
export function withPitchShift(stretcher) {
	let ratio = 1;
	// Stretcher output not yet read; `position` is where the next output sample is read from
	let left = new Float32Array(CHUNK * 4);
	let right = new Float32Array(CHUNK * 4);
	let filled = 0;
	let position = 0;
	let innerSpeed = 1;
	const chunkLeft = new Float32Array(CHUNK);
	const chunkRight = new Float32Array(CHUNK);

	function pull() {
		stretcher.render(chunkLeft, chunkRight, innerSpeed);
		if (filled + CHUNK > left.length) {
			left = grow(left);
			right = grow(right);
		}
		left.set(chunkLeft, filled);
		right.set(chunkRight, filled);
		filled += CHUNK;
	}

	/** Drop samples already read, keeping the one before `position` for the interpolation. */
	function dropRead() {
		const keepFrom = Math.floor(position) - 1;
		if (keepFrom < CHUNK) return;
		left.copyWithin(0, keepFrom, filled);
		right.copyWithin(0, keepFrom, filled);
		filled -= keepFrom;
		position -= keepFrom;
	}

	return {
		sampleRate: stretcher.sampleRate,
		frameSize: stretcher.frameSize,

		/** @param {number} cents up when positive */
		setCents(cents) {
			ratio = 2 ** (cents / 1200);
			if (ratio === 1) position = Math.round(position);
		},

		/**
		 * @param {Float32Array} outLeft
		 * @param {Float32Array} outRight
		 * @param {number} speed 1 = as recorded
		 */
		render(outLeft, outRight, speed) {
			innerSpeed = speed / ratio;
			for (let i = 0; i < outLeft.length; i++) {
				while (Math.floor(position) + 2 >= filled) pull();
				const at = Math.floor(position);
				const t = position - at;
				outLeft[i] = t === 0 ? left[at] : hermite(left, at, t);
				outRight[i] = t === 0 ? right[at] : hermite(right, at, t);
				position += ratio;
			}
			dropRead();
		},

		/** @param {number} seconds */
		seek(seconds) {
			stretcher.seek(seconds);
			filled = 0;
			position = 0;
		},

		/** Where in the source the sample about to be read comes from (seconds). */
		get time() {
			const unread = filled - position;
			return stretcher.time - (unread * innerSpeed) / stretcher.sampleRate;
		},

		get duration() {
			return stretcher.duration;
		}
	};
}

/**
 * 4-point, 3rd-order Hermite between samples `at` and `at + 1`.
 * @param {Float32Array} x
 * @param {number} at
 * @param {number} t 0 to 1
 */
function hermite(x, at, t) {
	const xm1 = x[at - 1] ?? x[at];
	const x0 = x[at];
	const x1 = x[at + 1];
	const x2 = x[at + 2];
	const c1 = 0.5 * (x1 - xm1);
	const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
	const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
	return ((c3 * t + c2) * t + c1) * t + x0;
}

/** @param {Float32Array} buffer */
function grow(buffer) {
	const bigger = new Float32Array(buffer.length * 2);
	bigger.set(buffer);
	return bigger;
}
