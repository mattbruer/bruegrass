/**
 * MP3 for sending takes: the one compressed format every browser plays,
 * and its encoder (LAME, as plain JavaScript) runs everywhere too, so any
 * device can both make and open it. At 128 kbps per channel it sounds the
 * same as the original to almost everyone, at about 1 MB a minute (a 24-bit
 * WAV is 8.6).
 *
 * MP3 adds a short silence at the front, and browsers differ on whether
 * they take it off. So instead of trusting the decoder, `leadingSilence`
 * measures it once on this device: it sends a click through the encoder
 * and this browser's decoder and sees how late it comes out. Every
 * received take loses exactly that much, so it lines up with the band.
 */

/** The rates MP3 can carry (a take at another rate goes as a WAV). */
export const MP3_SAMPLE_RATES = [32000, 44100, 48000];
const KBPS_PER_CHANNEL = 128;
/** Samples handed to the encoder at a time (a multiple of its 1152-sample frame). */
const SAMPLES_PER_CALL = 1152 * 8;
/** Let the page draw this often while encoding a long take (samples). */
const BREATHE_EVERY = 1152 * 80;

/**
 * @param {Float32Array[]} channels one or two
 * @param {number} sampleRate
 */
export async function encodeMp3(channels, sampleRate) {
	const { Mp3Encoder } = await import('@breezystack/lamejs');
	const used = channels.slice(0, 2).map(toInt16);
	const encoder = new Mp3Encoder(used.length, sampleRate, KBPS_PER_CHANNEL * used.length);
	/** @type {Uint8Array[]} */
	const parts = [];
	for (let start = 0; start < used[0].length; start += SAMPLES_PER_CALL) {
		const [left, right] = used.map((pcm) => pcm.subarray(start, start + SAMPLES_PER_CALL));
		parts.push(encoder.encodeBuffer(left, right));
		if (start % BREATHE_EVERY === 0) await new Promise((resolve) => setTimeout(resolve));
	}
	parts.push(encoder.flush());
	return joinBytes(parts);
}

/**
 * @param {Uint8Array} bytes
 * @param {import('./takeFormat.js').TakeAudio} audio
 */
export async function decodeMp3(bytes, audio) {
	const decoded = await decodeAt(bytes, audio.sampleRate, audio.channels);
	const lead = await leadingSilence(audio.sampleRate);
	return decoded.map((channel) => exactly(channel, lead, audio.frames));
}

/** @type {Map<number, Promise<number>>} */
const measured = new Map();

/**
 * How many samples late this browser's decoding of our MP3s comes out, at this rate.
 * @param {number} sampleRate
 */
export function leadingSilence(sampleRate) {
	if (!measured.has(sampleRate)) measured.set(sampleRate, measureLead(sampleRate));
	return /** @type {Promise<number>} */ (measured.get(sampleRate));
}

/** @param {number} sampleRate */
async function measureLead(sampleRate) {
	const clickAt = Math.round(sampleRate / 10);
	const test = new Float32Array(Math.round(sampleRate / 2));
	test[clickAt] = 0.9;
	const [decoded] = await decodeAt(await encodeMp3([test], sampleRate), sampleRate, 1);
	return loudestSample(decoded) - clickAt;
}

/**
 * Decode at the take's own rate (a live context would resample it to the speakers').
 * @param {Uint8Array} bytes
 * @param {number} sampleRate
 * @param {number} channels
 */
async function decodeAt(bytes, sampleRate, channels) {
	const context = new OfflineAudioContext(channels, 1, sampleRate);
	const decoded = await context.decodeAudioData(bytes.slice().buffer);
	return Array.from({ length: decoded.numberOfChannels }, (_, channel) =>
		decoded.getChannelData(channel)
	);
}

/**
 * `frames` samples starting `from` in (silence where the decoded audio runs short).
 * @param {Float32Array} samples
 * @param {number} from
 * @param {number} frames
 */
export function exactly(samples, from, frames) {
	const out = new Float32Array(frames);
	const start = Math.max(0, from);
	out.set(samples.subarray(start, start + frames), Math.max(0, -from));
	return out;
}

/** @param {Float32Array} samples */
export function loudestSample(samples) {
	let at = 0;
	for (let i = 1; i < samples.length; i++) {
		if (Math.abs(samples[i]) > Math.abs(samples[at])) at = i;
	}
	return at;
}

/** @param {Float32Array} samples */
function toInt16(samples) {
	return Int16Array.from(samples, (value) => Math.max(-1, Math.min(1, value)) * 0x7fff);
}

/** @param {Uint8Array[]} parts */
function joinBytes(parts) {
	const whole = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let offset = 0;
	for (const part of parts) {
		whole.set(part, offset);
		offset += part.length;
	}
	return whole;
}
