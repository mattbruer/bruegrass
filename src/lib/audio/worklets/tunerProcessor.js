/**
 * The tuner on the audio thread: the microphone in, a reading out about 47
 * times a second (tunerEngine.js). Nothing goes to the speakers.
 *
 * Options in:   processorOptions.referenceA (Hz, default 440)
 * Messages out: a TunerReading (tunerEngine.js)
 *
 * It imports its DSP, so worklets.js loads it bundled into one file.
 */
import { createTunerEngine } from '../tuner/tunerEngine.js';

class TunerProcessor extends AudioWorkletProcessor {
	/** @param {AudioWorkletNodeOptions} options */
	constructor(options) {
		super();
		this.engine = createTunerEngine(sampleRate, options.processorOptions?.referenceA ?? 440);
	}

	/** @param {Float32Array[][]} inputs */
	process(inputs) {
		const channel = inputs[0]?.[0];
		if (channel) {
			const reading = this.engine.push(channel);
			if (reading) this.port.postMessage(reading);
		}
		return true;
	}
}

registerProcessor('tuner', TunerProcessor);
