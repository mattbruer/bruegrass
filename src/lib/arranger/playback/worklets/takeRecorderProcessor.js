/**
 * Records its input on the audio thread: while recording, it collects every
 * sample sample-accurately (nothing a busy page can drop) and sends them to
 * the page in chunks.
 *
 * Messages in:  { type: 'start', at? } and { type: 'stop' }
 *               at: the audio-clock time (seconds) to start on, to the sample;
 *               left out (or already past), it starts straight away
 * Messages out: { type: 'started', frame } on the frame the take begins,
 *               { type: 'chunk', channels: Float32Array[] } while recording,
 *               then { type: 'stopped' } after the last chunk.
 *
 * Stands alone (no imports): see worklets.js.
 */

/** Frames per chunk sent to the page: a tenth of a second at 48 kHz, so not too many messages. */
const CHUNK_FRAMES = 4800;

class TakeRecorderProcessor extends AudioWorkletProcessor {
	/** @param {{ processorOptions: { channelCount: number } }} options */
	constructor(options) {
		super();
		this.channelCount = options.processorOptions.channelCount;
		this.recording = false;
		/** The audio-clock frame to start on (recording waits for it). */
		this.startFrame = 0;
		this.startChunk();

		this.port.onmessage = ({ data }) => {
			if (data.type === 'start') {
				this.startChunk();
				this.startFrame = Math.round((data.at ?? 0) * sampleRate);
				this.waiting = true;
				this.recording = true;
			} else if (data.type === 'stop' && this.recording) {
				this.recording = false;
				this.sendChunk();
				this.port.postMessage({ type: 'stopped' });
			}
		};
	}

	startChunk() {
		this.chunk = Array.from({ length: this.channelCount }, () => new Float32Array(CHUNK_FRAMES));
		this.filled = 0;
	}

	sendChunk() {
		if (this.filled === 0) return;
		const channels = this.chunk.map((channel) => channel.slice(0, this.filled));
		this.port.postMessage(
			{ type: 'chunk', channels },
			channels.map((channel) => channel.buffer)
		);
		this.startChunk();
	}

	/** @param {Float32Array[][]} inputs */
	process(inputs) {
		if (!this.recording) return true;

		// An input with nothing connected has no channels: record silence, so time keeps its place
		const input = inputs[0];
		const frames = input[0]?.length ?? 128;
		let done = 0;
		if (this.waiting) {
			// currentFrame: this block's first frame on the audio clock
			if (currentFrame + frames <= this.startFrame) return true;
			done = Math.max(0, this.startFrame - currentFrame);
			this.waiting = false;
			this.port.postMessage({ type: 'started', frame: currentFrame + done });
		}
		while (done < frames) {
			const count = Math.min(frames - done, CHUNK_FRAMES - this.filled);
			for (let channel = 0; channel < this.channelCount; channel++) {
				const from = input[channel];
				if (from) this.chunk[channel].set(from.subarray(done, done + count), this.filled);
			}
			this.filled += count;
			done += count;
			if (this.filled === CHUNK_FRAMES) this.sendChunk();
		}
		return true;
	}
}

registerProcessor('take-recorder', TakeRecorderProcessor);
