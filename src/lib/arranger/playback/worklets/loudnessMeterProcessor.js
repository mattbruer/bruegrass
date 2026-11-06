/**
 * Loudness meter (AudioWorklet processor): measures how loud the music
 * *sounds*, in LUFS, the way streaming services and broadcasters do
 * (ITU-R BS.1770 / EBU R128).
 *
 * The input must already be K-weighted (a high shelf and a low cut that
 * roughly match how the ear hears loudness); the output stage does that with
 * native IIRFilterNodes in front of this. Here we only add up power:
 *
 *   - every 100 ms, the block's mean square (left + right)
 *   - momentary: the last 400 ms
 *   - short-term: the last 3 s
 *   - integrated: the whole run since the last reset, "gated" so silence
 *     and quiet gaps don't drag it down (blocks under -70 LUFS are ignored,
 *     then blocks more than 10 LU under the average of the rest)
 *
 * Every 100 ms it posts { momentary, shortTerm, integrated } in LUFS
 * (-Infinity when there's nothing to measure). Post { type: 'reset' } to
 * start the integrated measurement again.
 *
 * Runs on the audio thread, so it stands alone (no imports).
 */

const BLOCK_SECONDS = 0.1;
const MOMENTARY_BLOCKS = 4; // 400 ms
const SHORT_TERM_BLOCKS = 30; // 3 s
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;
/** The most momentary readings kept for the integrated measurement (an hour). */
const MAX_HISTORY = 36000;

/** BS.1770's loudness of a summed mean square. */
const toLufs = (/** @type {number} */ power) =>
	power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity;

class LoudnessMeterProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.blockLength = Math.round(sampleRate * BLOCK_SECONDS);
		this.blockSum = 0;
		this.blockFill = 0;
		/** The last 3 s of block powers, newest last. */
		this.recentBlocks = [];
		/** Every gating block's power (400 ms windows, one per 100 ms) since the reset. */
		this.history = [];
		this.port.onmessage = (event) => {
			if (event.data?.type === 'reset') this.history = [];
		};
	}

	process(inputs) {
		const channels = inputs[0];
		if (!channels || channels.length === 0) return true;
		const frames = channels[0].length;

		for (let frame = 0; frame < frames; frame++) {
			let power = 0;
			for (const channel of channels) power += channel[frame] * channel[frame];
			this.blockSum += power;
			if (++this.blockFill === this.blockLength) this.finishBlock();
		}
		return true;
	}

	finishBlock() {
		this.recentBlocks.push(this.blockSum / this.blockLength);
		if (this.recentBlocks.length > SHORT_TERM_BLOCKS) this.recentBlocks.shift();
		this.blockSum = 0;
		this.blockFill = 0;

		const momentaryPower = this.averageOfLast(MOMENTARY_BLOCKS);
		if (this.recentBlocks.length >= MOMENTARY_BLOCKS) {
			this.history.push(momentaryPower);
			if (this.history.length > MAX_HISTORY) this.history.shift();
		}

		this.port.postMessage({
			momentary: toLufs(momentaryPower),
			shortTerm: toLufs(this.averageOfLast(SHORT_TERM_BLOCKS)),
			integrated: this.integrated()
		});
	}

	/** @param {number} count */
	averageOfLast(count) {
		const blocks = this.recentBlocks.slice(-count);
		if (blocks.length === 0) return 0;
		return blocks.reduce((sum, power) => sum + power, 0) / blocks.length;
	}

	/** The gated loudness of everything since the reset. */
	integrated() {
		const absoluteGate = 10 ** ((ABSOLUTE_GATE_LUFS + 0.691) / 10);
		const loudEnough = this.history.filter((power) => power > absoluteGate);
		if (loudEnough.length === 0) return -Infinity;

		const mean = loudEnough.reduce((sum, power) => sum + power, 0) / loudEnough.length;
		const relativeGate = mean * 10 ** (RELATIVE_GATE_LU / 10);
		const gated = loudEnough.filter((power) => power > relativeGate);
		return toLufs(gated.reduce((sum, power) => sum + power, 0) / gated.length);
	}
}

registerProcessor('loudness-meter', LoudnessMeterProcessor);
