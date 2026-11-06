/**
 * The sampling page's input: choose the audio interface, see its levels,
 * record from it and play takes back through it. The test take
 * (TestTake.svelte.js) and the session (session/) both record through this
 * one input, so there's one place that opens and closes it.
 *
 * The audio work is in $lib/recording; this only holds what the page shows
 * and does the steps in order.
 */
import { openInputChain } from '$lib/recording/inputChain.js';
import { listInputs, watchInputs } from '$lib/recording/micInput.js';
import { playTake } from '$lib/recording/playTake.js';
/** @typedef {import('$lib/recording/takeRecorder.js').Take} Take */
import {
	rememberThisDevicesRecordingInput,
	thisDevicesRecordingInput
} from '$lib/storage/thisDevice.js';

/** @typedef {'off' | 'opening' | 'on' | 'recording'} InputStatus */

export class InputCheck {
	/** @type {import('$lib/recording/micInput.js').InputDevice[]} */
	inputs = $state([]);
	/** The input in use or to use (null: the computer's default). */
	/** @type {string | null} */
	chosenId = $state(null);
	/** @type {InputStatus} */
	status = $state('off');
	/** What went wrong last, in plain words (empty when fine). */
	problem = $state('');
	channelCount = $state(0);
	/** Call-style processing the browser wouldn't turn off. */
	/** @type {string[]} */
	processingLeftOn = $state([]);

	/** @type {import('$lib/recording/inputChain.js').InputChain | null} */
	#chain = null;
	/** Stops whatever is playing (only one take plays at a time). */
	/** @type {(() => void) | null} */
	#stopPlaying = null;

	/**
	 * Start watching for inputs being plugged in. Returns the clean-up.
	 */
	watch() {
		const refresh = () => this.refreshInputs();
		refresh();
		return watchInputs(refresh);
	}

	async refreshInputs() {
		this.inputs = await listInputs();
		// Before the first turn-on, preselect the input this computer used last time (by name)
		if (this.status === 'off' && this.chosenId === null) {
			const remembered = thisDevicesRecordingInput();
			this.chosenId = this.inputs.find((input) => input.label === remembered)?.id ?? null;
		}
	}

	/** Open the chosen input (from a click: audio needs one). */
	async turnOn() {
		if (this.status !== 'off') return;
		this.status = 'opening';
		this.problem = '';
		try {
			const chain = await openInputChain(this.chosenId);
			this.#chain = chain;
			this.chosenId = chain.mic.deviceId;
			this.channelCount = chain.mic.channelCount;
			this.processingLeftOn = chain.mic.processingLeftOn;
			this.status = 'on';
			rememberThisDevicesRecordingInput(chain.mic.label);
			// Names only show once the page may use the microphone
			await this.refreshInputs();
		} catch (error) {
			this.status = 'off';
			this.problem = describeProblem(error);
		}
	}

	async turnOff() {
		this.stopPlaying();
		const chain = this.#chain;
		this.#chain = null;
		this.status = 'off';
		this.channelCount = 0;
		this.processingLeftOn = [];
		await chain?.close();
	}

	/** @param {string} id */
	async chooseInput(id) {
		const wasOn = this.status !== 'off';
		await this.stopRecording();
		await this.turnOff();
		this.chosenId = id;
		if (wasOn) await this.turnOn();
	}

	/** The latest samples of each input channel, for the meters (empty when off). */
	readLevels() {
		return this.#chain?.read() ?? [];
	}

	/** Start recording (does nothing unless the input is on and idle). */
	startRecording() {
		if (this.status !== 'on' || !this.#chain) return false;
		this.stopPlaying();
		this.#chain.recorder.start();
		this.status = 'recording';
		return true;
	}

	/** @returns {Promise<Take | null>} everything since startRecording (null if not recording) */
	async stopRecording() {
		if (this.status !== 'recording' || !this.#chain) return null;
		const take = await this.#chain.recorder.stop();
		this.status = 'on';
		return take;
	}

	/**
	 * Play a take, or part of it, stopping anything else playing.
	 * @param {Take} take
	 * @param {() => void} onEnded when it finishes or is stopped
	 * @param {{ start: number, end: number }} [range] frames to play (default: all)
	 * @returns {boolean} whether it started (needs the input on, and not recording)
	 */
	play(take, onEnded, range) {
		if (!this.#chain || this.status !== 'on') return false;
		this.stopPlaying();
		const stop = playTake(
			this.#chain.context,
			take,
			() => {
				if (this.#stopPlaying === stop) this.#stopPlaying = null;
				onEnded();
			},
			range
		);
		this.#stopPlaying = stop;
		return true;
	}

	stopPlaying() {
		this.#stopPlaying?.();
	}

	/** Let go of everything (leaving the page). */
	async close() {
		await this.turnOff();
	}
}

/**
 * Why the input didn't open, in words a player can act on.
 * @param {unknown} error
 */
function describeProblem(error) {
	const name = error instanceof DOMException ? error.name : '';
	if (name === 'NotAllowedError') {
		return 'The browser isn’t allowed to use the microphone. Allow it in the address bar, then try again.';
	}
	if (name === 'NotFoundError' || name === 'OverconstrainedError') {
		return 'That input isn’t there any more. Check it’s plugged in, or choose another.';
	}
	if (name === 'NotReadableError') {
		return 'Another app is using that input. Close it (or its settings), then try again.';
	}
	return `The input didn’t open: ${error instanceof Error ? error.message : String(error)}`;
}
