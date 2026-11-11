/**
 * The transcribe page's player: loads a song, then plays it at any speed
 * with its pitch kept. The stretching runs on the audio thread
 * (stretchPlayerProcessor.js); this class is what the page talks to, with
 * the song's time, length and state as $state for the controls.
 *
 * It owns its own audio context: call `dispose` when the page goes.
 */
import { createNativeWorkletNode } from '$lib/arranger/playback/worklets/worklets.js';
import { clampSpeed } from './speed.js';

export class StretchPlayer {
	/** Seconds into the song of what's playing now. */
	time = $state(0);
	duration = $state(0);
	playing = $state(false);
	loading = $state(false);
	error = $state('');
	speed = $state(1);

	/** @type {AudioContext | null} */
	#context = null;
	/** @type {AudioWorkletNode | null} */
	#node = null;
	#loadCount = 0;
	/** @type {number | null} null: the stretcher's own default */
	#frameSeconds = null;

	/**
	 * The stretcher's frame length (see sounds.js). Takes effect at once, from where it is.
	 * @param {number} seconds
	 */
	setFrameSeconds(seconds) {
		this.#frameSeconds = seconds;
		this.#node?.port.postMessage({ type: 'frame', seconds });
	}

	/**
	 * Fetch and decode a song, and hand it to the audio thread.
	 * @param {string} url
	 */
	async load(url) {
		const load = ++this.#loadCount;
		this.pause();
		this.loading = true;
		this.error = '';
		try {
			const node = await this.#ensureNode();
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Couldn't fetch the song (${response.status}).`);
			const buffer = await this.#context.decodeAudioData(await response.arrayBuffer());
			if (load !== this.#loadCount) return;

			const left = buffer.getChannelData(0).slice();
			const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1).slice() : undefined;
			node.port.postMessage(
				{ type: 'load', left, right },
				right ? [left.buffer, right.buffer] : [left.buffer]
			);
			node.port.postMessage({ type: 'speed', speed: this.speed });
			this.duration = buffer.duration;
			this.time = 0;
		} catch (error) {
			if (load === this.#loadCount)
				this.error = String(error instanceof Error ? error.message : error);
		} finally {
			if (load === this.#loadCount) this.loading = false;
		}
	}

	play() {
		if (!this.#node || this.loading) return;
		// Resume inside the tap: iPhone only starts audio from a user gesture
		this.#context?.resume();
		if (this.time >= this.duration) this.seek(0);
		this.#node.port.postMessage({ type: 'play' });
		this.playing = true;
	}

	pause() {
		this.#node?.port.postMessage({ type: 'pause' });
		this.playing = false;
	}

	/** @param {number} seconds */
	seek(seconds) {
		const time = Math.min(Math.max(0, seconds), this.duration);
		this.#node?.port.postMessage({ type: 'seek', seconds: time });
		this.time = time;
	}

	/** @param {number} speed 1 = as recorded */
	setSpeed(speed) {
		this.speed = clampSpeed(speed);
		this.#node?.port.postMessage({ type: 'speed', speed: this.speed });
	}

	dispose() {
		this.#loadCount++;
		this.#node?.disconnect();
		this.#context?.close();
		this.#node = null;
		this.#context = null;
	}

	async #ensureNode() {
		if (this.#node) return this.#node;
		this.#context = new AudioContext();
		const node = await createNativeWorkletNode(this.#context, 'stretch-player', {
			numberOfInputs: 0,
			outputChannelCount: [2]
		});
		node.port.onmessage = ({ data }) => this.#receive(data);
		node.connect(this.#context.destination);
		if (this.#frameSeconds) node.port.postMessage({ type: 'frame', seconds: this.#frameSeconds });
		this.#node = node;
		return node;
	}

	/** @param {{ type: string, seconds?: number }} message */
	#receive(message) {
		if (message.type === 'time' && this.playing) this.time = message.seconds ?? this.time;
		if (message.type === 'ended') {
			this.playing = false;
			this.time = this.duration;
		}
	}
}
