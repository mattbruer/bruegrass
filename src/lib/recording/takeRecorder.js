/**
 * Records takes from a source: start, stop, and get back the audio as one
 * Float32Array per channel. The recording itself happens on the audio
 * thread (worklets/takeRecorderProcessor.js), so it's sample-accurate.
 */
import { createNativeWorkletNode } from '$lib/arranger/playback/worklets/worklets.js';

/**
 * @typedef {{ channels: Float32Array[], sampleRate: number, startTime: number }} Take
 *   startTime: the audio-clock time (seconds) of its first sample
 * @typedef {(options: AudioWorkletNodeOptions) => Promise<AudioWorkletNode>} MakeRecorderNode
 */

/**
 * @param {BaseAudioContext} context
 * @param {AudioNode} source what to record
 * @param {number} channelCount how many of its channels
 * @param {MakeRecorderNode} [makeNode] how to make the worklet node (default: a plain
 *   Web Audio context's; the arranger passes Tone's, to record in the band's own context)
 */
export async function createTakeRecorder(
	context,
	source,
	channelCount,
	makeNode = (options) => createNativeWorkletNode(context, 'take-recorder', options)
) {
	const node = await makeNode({
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
	let startTime = 0;

	node.port.onmessage = ({ data }) => {
		if (data.type === 'started') startTime = data.frame / context.sampleRate;
		if (data.type === 'chunk') chunks.push(data.channels);
		if (data.type === 'stopped' && finish) {
			finish({
				channels: joinChunks(chunks, channelCount),
				sampleRate: context.sampleRate,
				startTime
			});
			chunks = [];
			finish = null;
		}
	};

	return {
		/** @param {number} [at] the audio-clock time to start on (default: now) */
		start(at) {
			chunks = [];
			startTime = at ?? context.currentTime;
			node.port.postMessage({ type: 'start', at });
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
