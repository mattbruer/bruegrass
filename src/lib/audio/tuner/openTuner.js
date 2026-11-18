/**
 * The tuner listening to the microphone: its own audio context, the input
 * with the browser's call processing off (micInput.js), mixed to one
 * channel, into the tuner worklet. Nothing goes to the speakers.
 *
 * Open it from a click (browsers only start audio after one), and close it
 * when the tuner goes away: that lets go of the microphone.
 */
import { createRecordingContext } from '../recording/recordingContext.js';
import { openMicInput } from '../recording/micInput.js';
import { createNativeWorkletNode } from '../worklets/worklets.js';

/**
 * @param {(reading: import('./tunerEngine.js').TunerReading) => void} onReading about 47 times a second
 * @param {{ referenceA?: number }} [options]
 */
export async function openTuner(onReading, { referenceA = 440 } = {}) {
	const context = await createRecordingContext();
	try {
		const mic = await openMicInput(context, null, { channels: 1 });
		const node = await createNativeWorkletNode(context, 'tuner', {
			numberOfInputs: 1,
			numberOfOutputs: 0,
			channelCount: 1,
			channelCountMode: 'explicit',
			channelInterpretation: 'speakers',
			processorOptions: { referenceA }
		});
		node.port.onmessage = ({ data }) => onReading(data);
		mic.source.connect(node);

		return {
			/** The input's name, as the browser gives it. */
			inputName: mic.label,
			async close() {
				node.port.onmessage = null;
				mic.close();
				await context.close();
			}
		};
	} catch (error) {
		await context.close();
		throw error;
	}
}
