/**
 * Records takes from a source: start, stop, and get back the audio as one
 * Float32Array per channel. The recording itself happens on the audio
 * thread (worklets/takeRecorderProcessor.js), so it's sample-accurate.
 */
import { createNativeWorkletNode } from '$lib/arranger/playback/worklets/worklets.js';

/** @typedef {{ channels: Float32Array[], sampleRate: number }} Take */

/**
 * @param {AudioContext} context
 * @param {AudioNode} source what to record
 * @param {number} channelCount how many of its channels
 */
export async function createTakeRecorder(context, source, channelCount) {
	const node = await createNativeWorkletNode(context, 'take-recorder', {
		numberOfInputs: 1,
		numberOfOutputs: 0,
		// Exactly the source's channels, kept apart (not mixed down or up)
		channelCount,
		channelCountMode: 'explicit',
		channelInterpretation: 'discrete',
		processorOptions: { channelCount }
	});
	source.connect(node);

	/** @type {Float32Array[][]} chunks so far, each one array per channel */
	let chunks = [];
	/** @type {((take: Take) => void) | null} */
	let finish = null;

	node.port.onmessage = ({ data }) => {
		if (data.type === 'chunk') chunks.push(data.channels);
		if (data.type === 'stopped' && finish) {
			finish({ channels: joinChunks(chunks, channelCount), sampleRate: context.sampleRate });
			chunks = [];
			finish = null;
		}
	};

	return {
		start() {
			chunks = [];
			node.port.postMessage({ type: 'start' });
		},

		/** @returns {Promise<Take>} everything since start() */
		stop() {
			return new Promise((resolve) => {
				finish = resolve;
				node.port.postMessage({ type: 'stop' });
			});
		},

		dispose() {
			node.port.onmessage = null;
			node.port.close();
			source.disconnect(node);
		}
	};
}

/** @typedef {Awaited<ReturnType<typeof createTakeRecorder>>} TakeRecorder */

/**
 * @param {Float32Array[][]} chunks
 * @param {number} channelCount
 */
function joinChunks(chunks, channelCount) {
	const frames = chunks.reduce((total, chunk) => total + chunk[0].length, 0);
	return Array.from({ length: channelCount }, (_, channel) => {
		const joined = new Float32Array(frames);
		let at = 0;
		for (const chunk of chunks) {
			joined.set(chunk[channel], at);
			at += chunk[channel].length;
		}
		return joined;
	});
}
