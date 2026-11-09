/**
 * Recording along with the band: the mic and the take recorder, opened in
 * the band's own audio context (Tone's), so the take and the band share one
 * sample clock and line up to the sample, give or take the delay measured
 * here.
 *
 * Nothing goes to the headphones from the mic (no monitoring): you hear
 * yourself with one ear off, or through an audio interface's own monitoring.
 *
 * Open it from a tap (browsers need one before the mic starts), and close it
 * when the take is done: that lets go of the mic.
 */
import { openMicInput } from '$lib/recording/micInput.js';
import { createTakeRecorder } from '$lib/recording/takeRecorder.js';
import { playClicks } from '$lib/recording/clickTrack.js';
import { createWorkletNode } from '../playback/worklets/worklets.js';
import { getMetronomeInput } from '../playback/mixerGraph.svelte.js';

/** Input names that mean Bluetooth: a long delay, and call-quality sound. */
const BLUETOOTH_NAMES = /airpods|bluetooth|hands-?free|beats|buds/i;

/**
 * @param {typeof import('tone')} Tone
 * @param {string | null} deviceId which input (null: the device's default)
 */
export async function openRecordAlong(Tone, deviceId) {
	setAudioSession('play-and-record'); // iPhone: before the mic opens, while still in the tap
	await Tone.start();
	const audio = /** @type {AudioContext} */ (/** @type {unknown} */ (Tone.getContext().rawContext));
	const mic = await openMicInput(audio, deviceId, { channels: 1 });
	try {
		const recorder = await createTakeRecorder(audio, mic.source, 1, (options) =>
			createWorkletNode(Tone, 'take-recorder', options)
		);
		const clickOut = audio.createGain();
		Tone.connect(clickOut, await getMetronomeInput());

		return {
			audio,
			recorder,
			inputName: mic.label,
			/** Bluetooth headphones' mic: worth a warning. */
			bluetooth: BLUETOOTH_NAMES.test(mic.label),
			/** How late the take is, from what the browser reports (seconds). */
			roundTrip: outputLatency(audio) + mic.latency,

			/**
			 * One bar of clicks before the band.
			 * @param {{ tempo: number, beatsPerBar: number }} bar
			 * @param {number} at the audio-clock time of its first click
			 */
			countIn(bar, at) {
				return playClicks(audio, { ...bar, bars: 1 }, clickOut, at);
			},

			close() {
				recorder.dispose();
				mic.close();
				clickOut.disconnect();
				setAudioSession('playback');
			}
		};
	} catch (problem) {
		mic.close();
		setAudioSession('playback');
		throw problem;
	}
}

/** @typedef {Awaited<ReturnType<typeof openRecordAlong>>} RecordAlong */

/**
 * The delay from the audio clock to the headphones. Browsers that don't
 * report it give the smaller part they do know (the context's own buffer).
 * @param {AudioContext} audio
 */
function outputLatency(audio) {
	return audio.outputLatency || audio.baseLatency || 0;
}

/**
 * iPhone (Safari 16.4+): 'play-and-record' keeps the mic on while music
 * plays; 'playback' plays through the silent switch, like a music app.
 * @param {'playback' | 'play-and-record'} type
 */
function setAudioSession(type) {
	const session = /** @type {any} */ (globalThis.navigator)?.audioSession;
	if (session) session.type = type;
}
