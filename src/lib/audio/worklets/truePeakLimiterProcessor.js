/**
 * True-peak lookahead limiter (AudioWorklet processor): the last thing
 * before the speakers, so nothing you do in the mixer can ever clip.
 *
 * How it stays clean:
 *   - True peak: it checks not just the samples but the waveform *between*
 *     them (4x oversampled), because a converter rebuilds that smooth
 *     waveform and it can swing higher than any sample ("inter-sample peaks").
 *   - Lookahead: the audio is delayed a few milliseconds, so the gain can
 *     ease down *before* a peak arrives instead of slamming on it. No
 *     overshoot, and no click.
 *   - Release: afterwards the gain comes back up gently, so it doesn't pump.
 *   - Both sides get the same gain, so the stereo picture never shifts.
 *
 * How the gain is worked out, per sample:
 *   needed gain (ceiling ÷ true peak, at most 1)
 *     → release (falls instantly, recovers slowly)
 *     → lowest value over the lookahead window
 *     → averaged over the same window (a smooth ramp down that reaches the
 *       needed gain exactly when the peak comes out of the delay)
 *
 * processorOptions: { ceilingDb, lookaheadSeconds, releaseSeconds }.
 * Post { type: 'bypass', value: true } to pass audio through untouched
 * (still delayed the same amount, so switching doesn't jump in time).
 * Posts { gainReductionDb } (≤ 0) about 30 times a second.
 *
 * Runs on the audio thread, so it stands alone (no imports).
 */

/** Oversampling for true-peak detection (BS.1770 uses 4x). */
const OVERSAMPLING = 4;
/**
 * Interpolation filter length per phase: the detector looks this many
 * samples around each point. BS.1770's reference uses 12; tested against
 * a long reference filter, 16 catches inter-sample peaks in realistic
 * (band-limited) music to within 0.1 dB, at little extra cost.
 */
const TAPS = 16;
/** How often the gain reduction is reported. */
const REPORT_SECONDS = 1 / 30;

/**
 * Filters that estimate the waveform at 1/4, 2/4 and 3/4 of the way between
 * samples: a windowed sinc (Blackman), each normalised so it passes DC at
 * unity gain.
 */
function interpolationPhases() {
	const half = TAPS / 2;
	const phases = [];
	for (let phase = 1; phase < OVERSAMPLING; phase++) {
		const fraction = phase / OVERSAMPLING;
		const taps = new Float64Array(TAPS);
		let sum = 0;
		for (let tap = 0; tap < TAPS; tap++) {
			const t = half - 1 + fraction - tap; // distance from this tap to the point we want
			const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
			const window =
				0.42 + 0.5 * Math.cos((Math.PI * t) / half) + 0.08 * Math.cos((2 * Math.PI * t) / half);
			taps[tap] = sinc * window;
			sum += taps[tap];
		}
		for (let tap = 0; tap < TAPS; tap++) taps[tap] /= sum;
		phases.push(taps);
	}
	return phases;
}

class TruePeakLimiterProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();
		const {
			ceilingDb = -1,
			lookaheadSeconds = 0.005,
			releaseSeconds = 0.15
		} = options?.processorOptions ?? {};

		this.ceiling = 10 ** (ceilingDb / 20);
		this.window = Math.max(1, Math.round(lookaheadSeconds * sampleRate));
		this.releaseCoefficient = Math.exp(-1 / (releaseSeconds * sampleRate));
		this.phases = interpolationPhases();
		this.bypassed = false;

		// The true-peak detector judges the sample TAPS/2 - 1 behind the newest one
		this.detectorDelay = TAPS / 2 - 1;
		// A peak found between two samples must be fully handled on both of
		// them, so the lowest gain is held one sample longer than the average
		this.holdLength = this.window + 1;
		// Audio is delayed by the detector's lag plus the lookahead window
		this.audioDelay = this.detectorDelay + this.window;

		/** Recent input per side, for the interpolation filters (ring buffers). */
		this.history = [new Float64Array(TAPS), new Float64Array(TAPS)];
		this.historyAt = 0;
		/** The delayed audio per side. */
		this.delayLength = this.audioDelay + 1;
		this.delayed = [new Float32Array(this.delayLength), new Float32Array(this.delayLength)];
		this.delayAt = 0;

		this.released = 1; // gain after the release stage

		/** Sliding minimum over the window: a queue of [index, gain], rising gains. */
		this.minQueue = {
			index: new Float64Array(this.holdLength + 1),
			gain: new Float64Array(this.holdLength + 1)
		};
		this.minHead = 0;
		this.minTail = 0;
		this.sampleIndex = 0;

		/** Running average over the window. */
		this.averageRing = new Float64Array(this.window).fill(1);
		this.averageAt = 0;
		this.averageSum = this.window;

		this.reportEvery = Math.round(REPORT_SECONDS * sampleRate);
		this.sinceReport = 0;
		this.lowestGain = 1;

		this.port.onmessage = (event) => {
			if (event.data?.type === 'bypass') this.bypassed = Boolean(event.data.value);
		};
	}

	/** The highest true-peak level across both sides at the sample being judged. */
	truePeak() {
		let peak = 0;
		for (const history of this.history) {
			// The sample itself...
			const centre = history[(this.historyAt + TAPS - 1 - this.detectorDelay) % TAPS];
			peak = Math.max(peak, Math.abs(centre));
			// ...and the waveform between it and the next one
			for (const taps of this.phases) {
				let value = 0;
				for (let tap = 0; tap < TAPS; tap++) {
					value += taps[tap] * history[(this.historyAt + tap) % TAPS];
				}
				peak = Math.max(peak, Math.abs(value));
			}
		}
		return peak;
	}

	/**
	 * The gain for the sample now leaving the delay.
	 * @param {number} needed
	 */
	nextGain(needed) {
		// Release: drop at once, recover slowly
		this.released =
			needed < this.released ? needed : needed + this.releaseCoefficient * (this.released - needed);

		// Sliding minimum over the window
		const queue = this.minQueue;
		const size = queue.index.length;
		while (this.minTail !== this.minHead) {
			const last = (this.minTail - 1 + size) % size;
			if (queue.gain[last] < this.released) break;
			this.minTail = last;
		}
		queue.index[this.minTail] = this.sampleIndex;
		queue.gain[this.minTail] = this.released;
		this.minTail = (this.minTail + 1) % size;
		while (queue.index[this.minHead] <= this.sampleIndex - this.holdLength) {
			this.minHead = (this.minHead + 1) % size;
		}
		const held = queue.gain[this.minHead];
		this.sampleIndex++;

		// Average over the window: a smooth ramp into each peak
		this.averageSum += held - this.averageRing[this.averageAt];
		this.averageRing[this.averageAt] = held;
		this.averageAt = (this.averageAt + 1) % this.window;
		return Math.min(1, this.averageSum / this.window);
	}

	process(inputs, outputs) {
		const input = inputs[0];
		const output = outputs[0];
		const frames = output[0].length;
		const left = input[0];
		const right = input[1] ?? input[0]; // mono in: both sides the same

		for (let frame = 0; frame < frames; frame++) {
			const inLeft = left ? left[frame] : 0;
			const inRight = right ? right[frame] : 0;

			this.history[0][this.historyAt] = inLeft;
			this.history[1][this.historyAt] = inRight;
			this.historyAt = (this.historyAt + 1) % TAPS;

			const peak = this.truePeak();
			const gain = this.nextGain(peak > this.ceiling ? this.ceiling / peak : 1);

			// Write the new sample into the delay, read the one leaving it
			this.delayed[0][this.delayAt] = inLeft;
			this.delayed[1][this.delayAt] = inRight;
			const leaving = (this.delayAt + 1) % this.delayLength;
			this.delayAt = leaving;

			for (let side = 0; side < output.length; side++) {
				const sample = this.delayed[Math.min(side, 1)][leaving];
				output[side][frame] = this.bypassed
					? sample
					: // A last guard: no sample past the ceiling, whatever happens
						Math.max(-this.ceiling, Math.min(this.ceiling, sample * gain));
			}

			if (gain < this.lowestGain) this.lowestGain = gain;
			if (++this.sinceReport >= this.reportEvery) {
				const reduction = this.bypassed ? 0 : 20 * Math.log10(this.lowestGain);
				this.port.postMessage({ gainReductionDb: reduction });
				this.sinceReport = 0;
				this.lowestGain = 1;
			}
		}
		return true;
	}
}

registerProcessor('true-peak-limiter', TruePeakLimiterProcessor);
