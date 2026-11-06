/**
 * AudioWorklets: our own DSP, running on the browser's audio thread. This
 * is the one place worklet code is loaded and worklet nodes are made, so a
 * new processor is: write it in this folder, add it to PROCESSORS, and call
 * createWorkletNode with its name.
 *
 * Why not Tone's addAudioWorkletModule: it only ever loads one module per
 * audio context, and we'll have several.
 *
 * A processor file must stand alone (no imports): it runs in the audio
 * thread's own scope, not the page's. Vite's `?url` gives its address.
 */
import limiterUrl from './truePeakLimiterProcessor.js?url';
import loudnessUrl from './loudnessMeterProcessor.js?url';

/** Each processor's registered name, and the file that registers it. */
const PROCESSORS = Object.freeze({
	'true-peak-limiter': limiterUrl,
	'loudness-meter': loudnessUrl
});

/** @typedef {keyof typeof PROCESSORS} ProcessorName */

/** Modules already loaded (or loading), per audio context. */
const loaded = new WeakMap();

/**
 * Load a processor's code into the audio thread (once per context), then
 * make a node that runs it.
 * @param {typeof import('tone')} Tone
 * @param {ProcessorName} name
 * @param {Partial<AudioWorkletNodeOptions>} [options]
 * @returns {Promise<AudioWorkletNode>}
 */
export async function createWorkletNode(Tone, name, options) {
	const context = Tone.getContext();
	const audio = context.rawContext;
	if (!audio.audioWorklet) {
		throw new Error('Audio processing needs a secure page (https or localhost).');
	}

	/** @type {Map<string, Promise<void>>} */
	let modules = loaded.get(audio);
	if (!modules) {
		modules = new Map();
		loaded.set(audio, modules);
	}
	const url = PROCESSORS[name];
	if (!modules.has(url)) modules.set(url, audio.audioWorklet.addModule(url));
	await modules.get(url);

	const node = context.createAudioWorkletNode(name, options);
	// A processor that throws goes silent for good; say so, or it just looks like nothing's playing
	node.onprocessorerror = (event) => console.error(`Audio processor "${name}" stopped:`, event);
	return node;
}
