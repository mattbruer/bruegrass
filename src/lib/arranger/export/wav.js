/**
 * WAV files: uncompressed audio every DAW opens. 24-bit PCM: well past what
 * the ear (or the samples) can tell from the original, without the size of
 * 32-bit float. Written by hand: the browser has no WAV encoder.
 */

/** Bits per sample. */
const BIT_DEPTH = 24;

/**
 * @param {Float32Array[]} channels one array per channel (-1 to 1), all the same length
 * @param {number} sampleRate
 * @returns {Uint8Array} the whole .wav file
 */
export function encodeWav(channels, sampleRate) {
	const bytesPerSample = BIT_DEPTH / 8;
	const frames = channels[0]?.length ?? 0;
	const blockAlign = channels.length * bytesPerSample;
	const dataSize = frames * blockAlign;
	const file = new Uint8Array(44 + dataSize);
	const view = new DataView(file.buffer);

	/** @param {number} at @param {string} text */
	const ascii = (at, text) =>
		[...text].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));

	ascii(0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	ascii(8, 'WAVE');
	ascii(12, 'fmt ');
	view.setUint32(16, 16, true); // fmt chunk size
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, channels.length, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * blockAlign, true); // bytes per second
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, BIT_DEPTH, true);
	ascii(36, 'data');
	view.setUint32(40, dataSize, true);

	// Samples interleaved (left, right, left, right…), little-endian 24-bit
	const fullScale = 2 ** (BIT_DEPTH - 1) - 1;
	let at = 44;
	for (let frame = 0; frame < frames; frame++) {
		for (const channel of channels) {
			const sample = Math.max(-1, Math.min(1, channel[frame]));
			const value = Math.round(sample * fullScale);
			file[at] = value & 0xff;
			file[at + 1] = (value >> 8) & 0xff;
			file[at + 2] = (value >> 16) & 0xff;
			at += 3;
		}
	}
	return file;
}
