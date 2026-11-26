/**
 * Plays part of a recording stretched to another speed, its pitch kept,
 * starting on an exact audio-clock time: like an AudioBufferSourceNode
 * with a speed that doesn't change the pitch. One node per clip played;
 * it ends itself when done.
 *
 * Recordings are sent once per audio context and kept here by key (every
 * node of a context shares this scope), so playing a take again costs
 * nothing to send.
 *
 * Messages in:  { type: 'play', key, channels?, from, speed, semitones?, at, duration }
 *                 channels: the recording (Float32Array per channel), when this
 *                 context may not have it yet; from: seconds into it; at: the
 *                 audio-clock time to start; duration: seconds of output;
 *                 semitones: moved up or down, the speed kept (0: the pitch as recorded)
 *               { type: 'stop' }  { type: 'forget' }  let go of every recording
 * Messages out: { type: 'kept', key }  the recording is here now
 */
import { createStretcher } from '../stretch/stretcher.js';
import { withPitchShift } from '../stretch/withPitchShift.js';

/** @type {Map<string, Float32Array[]>} */
const recordings = /** @type {any} */ (globalThis.stretchSourceRecordings ??= new Map());

class StretchSourceProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		/** @type {ReturnType<typeof withPitchShift> | null} */
		this.stretcher = null;
		this.speed = 1;
		this.startFrame = Infinity;
		this.endFrame = Infinity;
		this.stopped = false;
		this.spare = new Float32Array(128);
		this.port.onmessage = ({ data }) => this.receive(data);
	}

	/** @param {any} message */
	receive(message) {
		if (message.type === 'forget') recordings.clear();
		if (message.type === 'stop') this.stopped = true;
		if (message.type !== 'play') return;
		if (message.channels) {
			recordings.set(message.key, message.channels);
			this.port.postMessage({ type: 'kept', key: message.key });
		}
		const channels = recordings.get(message.key);
		if (!channels) return void (this.stopped = true);
		this.stretcher = withPitchShift(
			createStretcher({ left: channels[0], right: channels[1], sampleRate })
		);
		this.stretcher.setCents((message.semitones ?? 0) * 100);
		this.stretcher.seek(message.from);
		this.speed = message.speed;
		this.startFrame = Math.round(message.at * sampleRate);
		this.endFrame = this.startFrame + Math.round(message.duration * sampleRate);
	}

	/**
	 * @param {Float32Array[][]} _inputs
	 * @param {Float32Array[][]} outputs
	 */
	process(_inputs, outputs) {
		if (this.stopped || currentFrame >= this.endFrame) return false;
		const stretcher = this.stretcher;
		if (!stretcher || currentFrame + 128 <= this.startFrame) return true;

		const [left, right = this.spare] = outputs[0];
		const from = Math.max(0, this.startFrame - currentFrame);
		const until = Math.min(128, this.endFrame - currentFrame);
		stretcher.render(left.subarray(from, until), right.subarray(from, until), this.speed);
		return true;
	}
}

registerProcessor('stretch-source', StretchSourceProcessor);
