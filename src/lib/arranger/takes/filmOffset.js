/**
 * Lining an A/V take's film up with its sound. The film and the take hear
 * the same mic, so the take's sound is found inside the film's own
 * (compressed) sound. The camera starts before the take and stops after
 * it, so the take lies somewhere inside the film: the whole span is
 * searched. (The clocks alone were measured 0.6 s out in Chrome: when
 * MediaRecorder says it started isn't when its file starts.)
 */
import { findOffset } from '$lib/audio/analysis/findOffset.js';

/** Allowance past the film's end (seconds): the camera may stop a moment before the mic. */
const END_SLACK = 0.25;

/**
 * @param {Blob} film
 * @param {{ channels: Float32Array[], startTime: number }} take the take's audio, and the
 *   audio-clock time of its first sample
 * @param {number} filmStarted the audio-clock time the camera said it started: only used
 *   when the film's sound can't be read
 * @param {BaseAudioContext} audio to decode the film's sound (at the take's sample rate)
 * @returns {Promise<number>} seconds into the film where the take's first sample is
 */
export async function filmOffset(film, take, filmStarted, audio) {
	const clocksSay = take.startTime - filmStarted;
	try {
		const filmSound = (await audio.decodeAudioData(await film.arrayBuffer())).getChannelData(0);
		const takeSound = take.channels[0];
		const latest = (filmSound.length - takeSound.length) / audio.sampleRate + END_SLACK;
		const found = findOffset(takeSound, filmSound, audio.sampleRate, {
			from: 0,
			to: Math.max(0, latest)
		});
		return found ?? clocksSay;
	} catch {
		return clocksSay; // a browser that can't decode its own film's sound
	}
}
