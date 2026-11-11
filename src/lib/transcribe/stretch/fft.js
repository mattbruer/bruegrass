/**
 * A radix-2 complex FFT, in place on separate real and imaginary arrays.
 * `size` must be a power of two. The inverse is scaled by 1/size, so
 * inverse(forward(x)) gives x back.
 * @param {number} size
 */
export function createFft(size) {
	const levels = Math.log2(size);
	if (!Number.isInteger(levels)) throw new Error('FFT size must be a power of two');

	const cos = new Float64Array(size / 2);
	const sin = new Float64Array(size / 2);
	for (let i = 0; i < size / 2; i++) {
		cos[i] = Math.cos((2 * Math.PI * i) / size);
		sin[i] = Math.sin((2 * Math.PI * i) / size);
	}

	const reversed = new Uint32Array(size);
	for (let i = 0; i < size; i++) reversed[i] = reverseBits(i, levels);

	/**
	 * @param {Float64Array} re
	 * @param {Float64Array} im
	 * @param {1 | -1} sign 1 forward, -1 inverse
	 */
	function transform(re, im, sign) {
		for (let i = 0; i < size; i++) {
			const j = reversed[i];
			if (j > i) {
				let t = re[i];
				re[i] = re[j];
				re[j] = t;
				t = im[i];
				im[i] = im[j];
				im[j] = t;
			}
		}

		for (let half = 1; half < size; half *= 2) {
			const step = size / (half * 2);
			for (let start = 0; start < size; start += half * 2) {
				for (let k = 0; k < half; k++) {
					const c = cos[k * step];
					const s = sign * sin[k * step];
					const a = start + k;
					const b = a + half;
					const tr = re[b] * c + im[b] * s;
					const ti = im[b] * c - re[b] * s;
					re[b] = re[a] - tr;
					im[b] = im[a] - ti;
					re[a] += tr;
					im[a] += ti;
				}
			}
		}
	}

	return {
		size,
		/** @param {Float64Array} re @param {Float64Array} im */
		forward(re, im) {
			transform(re, im, 1);
		},
		/** @param {Float64Array} re @param {Float64Array} im */
		inverse(re, im) {
			transform(re, im, -1);
			for (let i = 0; i < size; i++) {
				re[i] /= size;
				im[i] /= size;
			}
		}
	};
}

/**
 * @param {number} value
 * @param {number} bits
 */
function reverseBits(value, bits) {
	let result = 0;
	for (let i = 0; i < bits; i++) {
		result = (result << 1) | (value & 1);
		value >>= 1;
	}
	return result;
}
