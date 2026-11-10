/**
 * How a take's audio travels in a song file: the one place that decides.
 * Takes are always recorded and kept at full quality on the device that
 * recorded them; only what's sent is compressed. When paid plans come, the
 * plan picks the format here (WAV for lossless).
 *
 * Reading follows whatever format the file names, so a song file in any
 * format listed here opens anywhere. A new format is one entry in FORMATS.
 */
import { encodeWav } from '../export/wav.js';
import { decodeMp3, encodeMp3, MP3_SAMPLE_RATES } from './mp3.js';

/** The format takes are sent in. */
export const SEND_FORMAT = 'mp3';

/**
 * @typedef {{ file: string, format: string, sampleRate: number, frames: number, channels: number }} TakeAudio
 *   file: its name in the song file; frames: its exact length, in samples
 * @typedef {{
 *   extension: string,
 *   encode: (channels: Float32Array[], sampleRate: number) => Promise<Uint8Array>,
 *   decode: (bytes: Uint8Array, audio: TakeAudio) => Promise<Float32Array[]>,
 *   canEncode: (sampleRate: number) => boolean
 * }} Format
 */

/** @type {Record<string, Format>} */
const FORMATS = {
	mp3: {
		extension: 'mp3',
		encode: encodeMp3,
		decode: decodeMp3,
		canEncode: (sampleRate) => MP3_SAMPLE_RATES.includes(sampleRate)
	},
	wav: {
		extension: 'wav',
		encode: async (channels, sampleRate) => encodeWav(channels, sampleRate),
		decode: decodeWav,
		canEncode: () => true
	}
};

/**
 * A take's audio, ready to send.
 * @param {string} name the file name without its extension
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {Promise<{ audio: TakeAudio, bytes: Uint8Array }>}
 */
export async function packTakeAudio(name, channels, sampleRate) {
	// MP3 only knows some sample rates; anything else goes lossless rather than not at all
	const format = FORMATS[SEND_FORMAT].canEncode(sampleRate) ? SEND_FORMAT : 'wav';
	const { extension, encode } = FORMATS[format];
	const bytes = await encode(channels, sampleRate);
	const audio = {
		file: `${name}.${extension}`,
		format,
		sampleRate,
		frames: channels[0]?.length ?? 0,
		channels: channels.length
	};
	return { audio, bytes };
}

/**
 * A received take's audio, exactly as long as it was sent and starting where it started.
 * @param {Uint8Array} bytes
 * @param {TakeAudio} audio
 */
export function unpackTakeAudio(bytes, audio) {
	const format = FORMATS[audio.format];
	if (!format) throw new Error(`a take is in a format this app can’t read (${audio.format})`);
	return format.decode(bytes, audio);
}

/**
 * @param {Uint8Array} bytes
 * @param {TakeAudio} audio
 */
async function decodeWav(bytes, audio) {
	const context = new OfflineAudioContext(audio.channels, 1, audio.sampleRate);
	const decoded = await context.decodeAudioData(bytes.slice().buffer);
	return Array.from({ length: decoded.numberOfChannels }, (_, channel) =>
		decoded.getChannelData(channel).slice(0, audio.frames)
	);
}
