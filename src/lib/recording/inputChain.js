/**
 * Everything needed to listen to an input and record it, in one context:
 *
 *   input ─┬─ splitter ─ one analyser per channel   (the meters)
 *          └─ take recorder                          (the audio thread)
 *
 * Nothing here goes to the speakers: you hear yourself through the audio
 * interface's direct monitoring, with no delay. Only playing a take back
 * does (playTake.js).
 *
 * Open it from a click (browsers need one before audio starts), and close
 * it when you leave: that releases the input and the context.
 */
import { createRecordingContext } from './recordingContext.js';
import { openMicInput } from './micInput.js';
import { createTakeRecorder } from './takeRecorder.js';

/** Samples each meter reads per frame: a little over a 60 Hz frame at 48 kHz, so no peak slips between frames. */
const METER_WINDOW = 1024;

/**
 * @param {string | null} deviceId which input (null: the default)
 */
export async function openInputChain(deviceId) {
	const context = await createRecordingContext();
	try {
		const mic = await openMicInput(context, deviceId);
		const splitter = context.createChannelSplitter(mic.channelCount);
		mic.source.connect(splitter);

		const analysers = Array.from({ length: mic.channelCount }, (_, channel) => {
			const analyser = context.createAnalyser();
			analyser.fftSize = METER_WINDOW;
			splitter.connect(analyser, channel);
			return analyser;
		});
		// One buffer per meter, reused every frame (no garbage while you play)
		const readings = analysers.map(() => new Float32Array(METER_WINDOW));

		const recorder = await createTakeRecorder(context, mic.source, mic.channelCount);

		return {
			context,
			mic,
			recorder,

			/** The latest samples from each input channel (for meters). */
			read() {
				analysers.forEach((analyser, channel) =>
					analyser.getFloatTimeDomainData(readings[channel])
				);
				return readings;
			},

			async close() {
				recorder.dispose();
				mic.source.disconnect();
				splitter.disconnect();
				mic.close();
				await context.close();
			}
		};
	} catch (error) {
		await context.close();
		throw error;
	}
}

/** @typedef {Awaited<ReturnType<typeof openInputChain>>} InputChain */
