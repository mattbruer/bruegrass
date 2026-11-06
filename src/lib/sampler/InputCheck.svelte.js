/**
 * The sampling page's first step: choose the audio interface, see its
 * levels, record a test take, look at it and listen back.
 *
 * The audio work is in $lib/recording; this only holds what the page shows
 * and does the steps in order. Not kept between visits yet (the take is
 * only in memory), so leaving with a take asks first.
 */
import { openInputChain } from '$lib/recording/inputChain.js';
import { listInputs, watchInputs } from '$lib/recording/micInput.js';
import { playTake } from '$lib/recording/playTake.js';
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

	/** The last take (raw: big arrays, nothing in them changes). */
	/** @type {import('$lib/recording/takeRecorder.js').Take | null} */
	take = $state.raw(null);
	/** Saved to a file since it was recorded? */
	takeDownloaded = $state(false);
	playing = $state(false);

	/** @type {import('$lib/recording/inputChain.js').InputChain | null} */
	#chain = null;
	/** @type {(() => void) | null} */
	#stopPlaying = null;

	/** Is there a take that would be lost by leaving? */
	get hasUnsavedTake() {
		return this.take !== null && !this.takeDownloaded;
	}

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
		if (this.status === 'recording') await this.stopRecording();
		await this.turnOff();
		this.chosenId = id;
		if (wasOn) await this.turnOn();
	}

	/** The latest samples of each input channel, for the meters (empty when off). */
	readLevels() {
		return this.#chain?.read() ?? [];
	}

	startRecording() {
		if (this.status !== 'on' || !this.#chain) return;
		this.stopPlaying();
		this.#chain.recorder.start();
		this.status = 'recording';
	}

	async stopRecording() {
		if (this.status !== 'recording' || !this.#chain) return;
		const take = await this.#chain.recorder.stop();
		this.status = 'on';
		this.take = take;
		this.takeDownloaded = false;
	}

	toggleRecording() {
		if (this.status === 'recording') this.stopRecording();
		else this.startRecording();
	}

	play() {
		if (!this.take || !this.#chain || this.status === 'recording') return;
		this.stopPlaying();
		this.playing = true;
		this.#stopPlaying = playTake(this.#chain.context, this.take, () => {
			this.playing = false;
			this.#stopPlaying = null;
		});
	}

	stopPlaying() {
		this.#stopPlaying?.();
	}

	togglePlaying() {
		if (this.playing) this.stopPlaying();
		else this.play();
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
