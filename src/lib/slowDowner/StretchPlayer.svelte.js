/**
 * The transcribe page's player: loads a song, then plays it at any speed
 * with its pitch kept. The stretching runs on the audio thread
 * (stretchPlayerProcessor.js); this class is what the page talks to, with
 * the song's time, length and state as $state for the controls.
 *
 * It plays in Tone's audio context, the band's, so the band can be timed to
 * it (`onClock`). Call `dispose` when the page goes.
 *
 * @typedef {{ seconds: number, at: number, speed: number }} Clock
 *   `seconds` into the song is heard at audio-clock time `at`, playing at `speed`
 */
import { createNativeWorkletNode } from '$lib/audio/worklets/worklets.js';
import { nativeContextOf } from '$lib/audio/nativeContext.js';
import { clampSpeed } from './speed.js';
import { clampCents } from './tuning.js';

export class StretchPlayer {
	/** Seconds into the song of what's playing now. */
	time = $state(0);
	duration = $state(0);
	playing = $state(false);
	loading = $state(false);
	error = $state('');
	speed = $state(1);
	/** The song's pitch moved by this much (fine tuning; 0: as recorded). */
	cents = $state(0);

	/** Told where the song is about 40 times a second while playing, and at once after a jump. */
	/** @type {(clock: Clock) => void} */
	onClock = () => {};
	/** Told when it pauses (or a new song loads). */
	onPause = () => {};

	/** @type {AudioContext | null} */
	#context = null;
	/** @type {AudioWorkletNode | null} */
	#node = null;
	#loadCount = 0;
	/** @type {number | null} null: the stretcher's own default */
	#frameSeconds = null;
	/** @type {{ from: number, to: number } | null} */
	#loop = null;
	/** @type {{ times: number[], accents: boolean[] }} */
	#clicks = { times: [], accents: [] };
	/** @type {import('./partNotes.js').PartNote[]} */
	#notes = [];
	/** @type {{ recording: number, parts: Record<string, number> }} */
	#levels = { recording: 1, parts: {} };

	/**
	 * The stretcher's frame length (see sounds.js). Takes effect at once, from where it is.
	 * @param {number} seconds
	 */
	setFrameSeconds(seconds) {
		this.#frameSeconds = seconds;
		this.#node?.port.postMessage({ type: 'frame', seconds });
	}

	/**
	 * Clicks over the song, on these times in it (seconds). Empty lists for none.
	 * @param {{ times: number[], accents: boolean[] }} clicks
	 */
	setClicks(clicks) {
		this.#clicks = { times: [...clicks.times], accents: [...clicks.accents] };
		this.#node?.port.postMessage({ type: 'clicks', ...this.#clicks });
	}

	/**
	 * Written notes to play along with the song (empty: none).
	 * @param {import('./partNotes.js').PartNote[]} notes in order of start
	 */
	setNotes(notes) {
		this.#notes = notes;
		this.#node?.port.postMessage({ type: 'notes', notes });
	}

	/**
	 * How loud the recording and each part's notes are, 0 to 1 (0: muted).
	 * @param {{ recording: number, parts: Record<string, number> }} levels
	 */
	setLevels(levels) {
		this.#levels = { recording: levels.recording, parts: { ...levels.parts } };
		this.#node?.port.postMessage({ type: 'levels', ...this.#levels });
	}

	/**
	 * Play one stretch of the song over and over, or null to play on.
	 * @param {{ from: number, to: number } | null} loop seconds into the song
	 */
	setLoop(loop) {
		this.#loop = loop;
		this.#node?.port.postMessage({ type: 'loop', from: loop?.from ?? null, to: loop?.to ?? null });
	}

	/**
	 * Fetch (or read) and decode a song, and hand it to the audio thread.
	 * Gives back the decoded audio, or null if another load replaced this one
	 * or it failed (see `error`).
	 * @param {string | Blob} source a URL, or a file the user picked
	 * @returns {Promise<AudioBuffer | null>}
	 */
	async load(source) {
		const load = ++this.#loadCount;
		this.pause();
		this.loading = true;
		this.error = '';
		try {
			const node = await this.#ensureNode();
			const bytes = await readBytes(source);
			const buffer = await this.#context.decodeAudioData(bytes);
			if (load !== this.#loadCount) return null;

			const left = buffer.getChannelData(0).slice();
			const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1).slice() : undefined;
			node.port.postMessage(
				{ type: 'load', left, right },
				right ? [left.buffer, right.buffer] : [left.buffer]
			);
			node.port.postMessage({ type: 'speed', speed: this.speed });
			this.duration = buffer.duration;
			this.time = 0;
			return buffer;
		} catch (error) {
			if (load === this.#loadCount)
				this.error = String(error instanceof Error ? error.message : error);
			return null;
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
		this.onPause();
	}

	/** The stretch being played over and over (null: none). */
	get loop() {
		return this.#loop;
	}

	/** @param {number} seconds */
	seek(seconds) {
		const time = Math.min(Math.max(0, seconds), this.duration);
		this.#node?.port.postMessage({ type: 'seek', seconds: time });
		this.time = time;
	}

	/** @param {number} cents up when positive, within ±50 */
	setCents(cents) {
		this.cents = clampCents(cents);
		this.#node?.port.postMessage({ type: 'tune', cents: this.cents });
	}

	/** @param {number} speed 1 = as recorded */
	setSpeed(speed) {
		this.speed = clampSpeed(speed);
		this.#node?.port.postMessage({ type: 'speed', speed: this.speed });
	}

	/** Let go of the player (the audio context is the band's, and stays). */
	dispose() {
		this.#loadCount++;
		this.#node?.port.postMessage({ type: 'pause' });
		this.#node?.disconnect();
		this.#node = null;
		this.#context = null;
	}

	async #ensureNode() {
		if (this.#node) return this.#node;
		this.#context = nativeContextOf(await import('tone'));
		const node = await createNativeWorkletNode(this.#context, 'stretch-player', {
			numberOfInputs: 0,
			outputChannelCount: [2]
		});
		node.port.onmessage = ({ data }) => this.#receive(data);
		node.connect(this.#context.destination);
		if (this.#frameSeconds) node.port.postMessage({ type: 'frame', seconds: this.#frameSeconds });
		node.port.postMessage({ type: 'clicks', ...this.#clicks });
		node.port.postMessage({ type: 'notes', notes: this.#notes });
		node.port.postMessage({ type: 'tune', cents: this.cents });
		node.port.postMessage({ type: 'levels', ...this.#levels });
		node.port.postMessage({
			type: 'loop',
			from: this.#loop?.from ?? null,
			to: this.#loop?.to ?? null
		});
		this.#node = node;
		return node;
	}

	/** @param {{ type: string } & Partial<Clock>} message */
	#receive(message) {
		if (message.type === 'time' && this.playing) {
			const { seconds = this.time, at = 0, speed = this.speed } = message;
			this.time = seconds;
			this.onClock({ seconds, at, speed });
		}
		if (message.type === 'ended') {
			this.playing = false;
			this.time = this.duration;
			this.onPause();
		}
	}
}

/** @param {string | Blob} source */
async function readBytes(source) {
	if (typeof source !== 'string') return source.arrayBuffer();
	const response = await fetch(source);
	if (!response.ok) throw new Error(`Couldn't fetch the song (${response.status}).`);
	return response.arrayBuffer();
}
