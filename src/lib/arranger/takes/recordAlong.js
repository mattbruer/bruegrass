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
import { openMicInput } from '$lib/audio/recording/micInput.js';
import { holdForMic } from '$lib/audio/audioSession.js';
import { createTakeRecorder } from '$lib/audio/recording/takeRecorder.js';
import { createWorkletNode } from '../../audio/worklets/worklets.js';
import { cameraConstraints } from '$lib/video/camera.js';
import { createVideoRecorder } from '$lib/video/videoRecorder.js';

/** Input names that mean Bluetooth: a long delay, and call-quality sound. */
const BLUETOOTH_NAMES = /airpods|bluetooth|hands-?free|beats|buds/i;

/**
 * @param {typeof import('tone')} Tone
 * @param {string | null} deviceId which input (null: the device's default)
 * @param {{ filming?: boolean, cameraId?: string | null }} [options] filming: an A/V lane's
 *   take, with the camera (cameraId: which; null: the front camera)
 */
export async function openRecordAlong(Tone, deviceId, { filming = false, cameraId = null } = {}) {
	const releaseSession = holdForMic(); // iPhone/iPad: before anything is awaited, while still in the tap
	const audio = /** @type {AudioContext} */ (/** @type {unknown} */ (Tone.getContext().rawContext));
	const mic = await Tone.start()
		.then(() =>
			openMicInput(audio, deviceId, {
				channels: 1,
				camera: filming ? cameraConstraints(cameraId) : null
			})
		)
		.catch((problem) => {
			releaseSession();
			throw problem;
		});
	try {
		const recorder = await createTakeRecorder(audio, mic.source, 1, (options) =>
			createWorkletNode(Tone, 'take-recorder', options)
		);
		const video = filming ? createVideoRecorder(mic.stream) : null;

		return {
			audio,
			recorder,
			/** Films the take (null: an audio lane). */
			video,
			/** The camera, for a preview while recording (null: not filming). */
			camera: filming ? mic.stream : null,
			inputName: mic.label,
			/** Bluetooth headphones' mic: worth a warning. */
			bluetooth: BLUETOOTH_NAMES.test(mic.label),
			/** How late the take is, from what the browser reports (seconds). */
			roundTrip: outputLatency(audio) + mic.latency,

			close() {
				video?.dispose();
				recorder.dispose();
				mic.close();
				releaseSession();
			}
		};
	} catch (problem) {
		mic.close();
		releaseSession();
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
