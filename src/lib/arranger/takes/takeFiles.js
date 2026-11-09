/**
 * Takes as files, to send to someone and to add theirs: a WAV that starts
 * one bar before bar 1 (see takeTiming.js), so it drops into the same song
 * on another device, or into a DAW, already lined up.
 */
import { encodeWav } from '../export/wav.js';
import { audioFromCountIn } from './takeTiming.js';

/**
 * @param {import('$lib/storage/songTakes.js').TakeDocument} take
 * @param {Float32Array[]} channels its audio
 * @param {number} barSeconds bar 1's length, at the take's tempo
 */
export function takeAsWav(take, channels, barSeconds) {
	const audio = audioFromCountIn({ ...take, channels }, barSeconds);
	return encodeWav(audio, take.sampleRate);
}

/**
 * Read an audio file (WAV, or anything the browser can play) as one mono
 * channel at the context's rate: a stereo file is mixed down.
 * @param {File} file
 * @param {BaseAudioContext} audio
 */
export async function readAudioFile(file, audio) {
	const decoded = await audio.decodeAudioData(await file.arrayBuffer());
	const mono = new Float32Array(decoded.length);
	for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
		const samples = decoded.getChannelData(channel);
		for (let i = 0; i < mono.length; i++) mono[i] += samples[i] / decoded.numberOfChannels;
	}
	return { channels: [mono], sampleRate: decoded.sampleRate };
}
