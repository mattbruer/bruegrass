/**
 * The tuner while it's open: the microphone, and what it hears. The note
 * and whether it's sounding are state (they change rarely); the latest
 * reading is a plain object the display reads every frame.
 */
import { openTuner } from '$lib/audio/tuner/openTuner.js';

export class TunerState {
	/** @type {'off' | 'opening' | 'listening' | 'error'} */
	status = $state('off');
	error = $state('');
	inputName = $state('');
	/** @type {number | null} the note shown (MIDI) */
	note = $state(null);
	sounding = $state(false);
	referenceA = 440;

	/** @type {import('$lib/audio/tuner/tunerEngine.js').TunerReading | null} */
	latest = null;
	/** @type {Awaited<ReturnType<typeof openTuner>> | null} */
	#tuner = null;

	/** Start listening. Call it from a click: browsers only start audio after one. */
	async open() {
		if (this.status === 'opening' || this.status === 'listening') return;
		this.status = 'opening';
		try {
			const tuner = await openTuner((reading) => this.#hear(reading), {
				referenceA: this.referenceA
			});
			if (this.status !== 'opening') return void tuner.close(); // closed while opening
			this.#tuner = tuner;
			this.inputName = tuner.inputName;
			this.status = 'listening';
		} catch (error) {
			this.status = 'error';
			this.error = micProblem(error);
		}
	}

	async close() {
		this.status = 'off';
		this.latest = null;
		this.note = null;
		this.sounding = false;
		const tuner = this.#tuner;
		this.#tuner = null;
		await tuner?.close();
	}

	/** @param {import('$lib/audio/tuner/tunerEngine.js').TunerReading} reading */
	#hear(reading) {
		this.latest = reading;
		this.note = reading.note;
		this.sounding = reading.sounding;
	}
}

/** @param {unknown} error */
function micProblem(error) {
	const name = error instanceof Error ? error.name : '';
	if (name === 'NotAllowedError')
		return 'The tuner needs the microphone. Allow it for this site in your browser, then try again.';
	if (name === 'NotFoundError') return 'No microphone was found.';
	return error instanceof Error ? error.message : 'The microphone could not be opened.';
}
