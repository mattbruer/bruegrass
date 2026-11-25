/**
 * Stretched sources: part of a recording played at another speed with its
 * pitch kept, starting on an exact audio-clock time (the `stretch-source`
 * worklet). Each recording is sent to the audio thread once per context,
 * by key, and kept there until forgotten.
 */
import { createLoadedNativeWorkletNode, loadNativeWorklet } from '$lib/audio/worklets/worklets.js';

/** Keys the audio thread has confirmed it keeps, per context. */
const kept = new WeakMap();

/** @param {BaseAudioContext} audio */
function keptIn(audio) {
	if (!kept.has(audio)) kept.set(audio, new Set());
	return /** @type {Set<string>} */ (kept.get(audio));
}

/**
 * Load the worklet, so sources can then be started at once (call before playing).
 * @param {BaseAudioContext} audio
 */
export function prepareStretchSources(audio) {
	return loadNativeWorklet(audio, 'stretch-source');
}

/**
 * Start playing, stretched. Connect the node to where it should sound; it
 * ends itself after `duration`.
 * @param {BaseAudioContext} audio
 * @param {{
 *   key: string, buffer: AudioBuffer, from: number, speed: number, at: number, duration: number
 * }} play key: names the recording (a take's id); from: seconds into it; speed: 0.5 = half
 *   speed; at: the audio-clock time to start; duration: seconds of output
 */
export function startStretchSource(audio, { key, buffer, from, speed, at, duration }) {
	const channelCount = buffer.numberOfChannels;
	const node = createLoadedNativeWorkletNode(audio, 'stretch-source', {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [channelCount]
	});
	const keys = keptIn(audio);
	const channels = keys.has(key)
		? undefined
		: Array.from({ length: channelCount }, (_, index) => buffer.getChannelData(index));
	node.port.onmessage = ({ data }) => data.type === 'kept' && keys.add(data.key);
	node.port.postMessage({ type: 'play', key, channels, from, speed, at, duration });

	return {
		node,
		stop() {
			node.port.postMessage({ type: 'stop' });
			node.port.onmessage = null;
		}
	};
}

/**
 * Let go of every recording the audio thread keeps for this context (when
 * another song opens).
 * @param {BaseAudioContext} audio
 */
export function forgetStretchSources(audio) {
	if (!keptIn(audio).size) return;
	keptIn(audio).clear();
	const node = createLoadedNativeWorkletNode(audio, 'stretch-source', { numberOfInputs: 0 });
	node.port.postMessage({ type: 'forget' });
	node.port.postMessage({ type: 'stop' });
}
