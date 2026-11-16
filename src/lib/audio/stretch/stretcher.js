/**
 * Plays a song at any speed without changing its pitch: a phase vocoder.
 * Each output frame is a frame of the source with its phases re-chosen
 * (phaseGradient.js) so that, laid side by side at the output's own pace,
 * the notes keep their pitch and the attacks stay sharp.
 *
 * Both channels get the same phase change, worked out on their mix, so the
 * stereo picture stays put.
 *
 * Plain code with no Web Audio in it: the AudioWorklet runs it live, and
 * Node runs it for tests and listening clips.
 */
import { createFft } from './fft.js';
import { createWindows, overlapGain } from './windows.js';
import { createFrameAnalyser } from './analyseFrame.js';
import { createPhaseGradient } from './phaseGradient.js';

/** Frame length in seconds when none is given: longer is cleaner on held notes, shorter on fast picking (the page's choices are in ../sounds.js). */
export const FRAME_SECONDS = 0.046;
/** Frames overlapping each output sample. More is smoother and costs more. */
export const OVERLAP = 8;
/** Bins quieter than this, relative to the loudest, aren't worth tracking (−100 dB). */
const TOLERANCE = 1e-5;

/**
 * The power-of-two frame size nearest a length in seconds at this sample rate.
 * @param {number} sampleRate
 * @param {number} [seconds]
 */
export function frameSizeFor(sampleRate, seconds = FRAME_SECONDS) {
	return 2 ** Math.round(Math.log2(seconds * sampleRate));
}

/**
 * @param {{ left: Float32Array, right?: Float32Array, sampleRate: number, frameSize?: number }} options
 *   left/right: the whole song; leave out right for mono
 */
export function createStretcher({
	left,
	right = left,
	sampleRate,
	frameSize = frameSizeFor(sampleRate)
}) {
	const size = frameSize;
	const half = size / 2;
	const mask = size - 1;
	const hop = size / OVERLAP;
	const analyser = createFrameAnalyser({ size, left, right });
	const bins = analyser.bins;
	const phases = createPhaseGradient(bins);
	const fft = createFft(size);
	const window = createWindows(size);
	const gain = 1 / overlapGain(size, hop);

	const re = new Float64Array(size);
	const im = new Float64Array(size);
	// Output still being added to by later frames, one array per channel
	const pendingLeft = new Float64Array(size);
	const pendingRight = new Float64Array(size);
	// The finished hop, waiting to be read
	const readyLeft = new Float32Array(hop);
	const readyRight = new Float32Array(hop);
	let readyIndex = hop;

	// Source sample at the centre of the next frame
	let sourcePosition = 0;
	// Where a jump asked to start; frames begin there on the next render
	let startAt = 0;
	let startSeconds = 0;
	let fresh = true;
	// Where in the source each recent frame was taken, to know what's being heard
	const recentCentres = new Float64Array(OVERLAP / 2 + 1);
	let framesMade = 0;
	let readySource = 0;
	let readySpeed = 1;

	/** @param {number} speed */
	function makeFrame(speed) {
		const centre = Math.round(sourcePosition);
		const frame = analyser.analyse(centre);

		const phase =
			fresh || speed === 1
				? phases.useSourcePhase(frame.phase, frame.magnitude, frame.frequency)
				: phases.next({ ...frame, hop, tolerance: TOLERANCE });
		fresh = false;

		packRotatedSpectrum(frame, phase);
		fft.inverse(re, im);

		for (let k = 0; k < size; k++) {
			const j = (k + half) & mask;
			const shaped = window.window[k] * gain;
			pendingLeft[k] += re[j] * shaped;
			pendingRight[k] += im[j] * shaped;
		}

		recentCentres[framesMade % recentCentres.length] = centre;
		framesMade++;
		sourcePosition += hop * speed;
	}

	/**
	 * Turn each bin of both channels by how much its chosen phase differs
	 * from the mix's own, then pack the two (real) channels into one complex
	 * spectrum so one inverse FFT gives both.
	 * @param {ReturnType<typeof analyser.analyse>} frame
	 * @param {Float64Array} phase
	 */
	function packRotatedSpectrum(frame, phase) {
		for (let m = 0; m < bins; m++) {
			const turn = phase[m] - frame.phase[m];
			const c = Math.cos(turn);
			const s = Math.sin(turn);
			let lr = frame.leftRe[m] * c - frame.leftIm[m] * s;
			let li = frame.leftRe[m] * s + frame.leftIm[m] * c;
			let rr = frame.rightRe[m] * c - frame.rightIm[m] * s;
			let ri = frame.rightRe[m] * s + frame.rightIm[m] * c;
			if (m === 0 || m === half) {
				li = 0;
				ri = 0;
			}
			re[m] = lr - ri;
			im[m] = li + rr;
			if (m > 0 && m < half) {
				re[size - m] = lr + ri;
				im[size - m] = rr - li;
			}
		}
	}

	/**
	 * After a jump, make the frames that lead up to the start point and throw
	 * their output away, so the first sample heard is the start point itself,
	 * at full level.
	 * @param {number} speed
	 */
	function primeFrom(speed) {
		sourcePosition = startAt - (OVERLAP / 2) * hop * speed;
		for (let i = 0; i < OVERLAP; i++) {
			makeFrame(speed);
			shiftPending();
		}
	}

	/** Move the finished hop out of the pending output, and shift the rest along. */
	function finishHop() {
		for (let k = 0; k < hop; k++) {
			readyLeft[k] = pendingLeft[k];
			readyRight[k] = pendingRight[k];
		}
		shiftPending();
		readyIndex = 0;
		// The hop just finished starts where the frame from half a frame ago was centred
		const behind = Math.max(0, framesMade - 1 - OVERLAP / 2);
		readySource = recentCentres[behind % recentCentres.length];
	}

	function shiftPending() {
		pendingLeft.copyWithin(0, hop);
		pendingRight.copyWithin(0, hop);
		pendingLeft.fill(0, size - hop);
		pendingRight.fill(0, size - hop);
	}

	return {
		sampleRate,
		frameSize: size,

		/**
		 * Fill `outLeft`/`outRight` with the next stretch of output.
		 * @param {Float32Array} outLeft
		 * @param {Float32Array} outRight
		 * @param {number} speed 1 = as recorded, 0.5 = half speed
		 */
		render(outLeft, outRight, speed) {
			for (let i = 0; i < outLeft.length; i++) {
				if (readyIndex === hop) {
					readySpeed = speed;
					if (fresh) primeFrom(speed);
					makeFrame(speed);
					finishHop();
				}
				outLeft[i] = readyLeft[readyIndex];
				outRight[i] = readyRight[readyIndex];
				readyIndex++;
			}
		},

		/**
		 * Carry on from `seconds` in the source.
		 * @param {number} seconds
		 */
		seek(seconds) {
			startSeconds = seconds;
			startAt = Math.round(seconds * sampleRate);
			pendingLeft.fill(0);
			pendingRight.fill(0);
			readyIndex = hop;
			fresh = true;
			framesMade = 0;
			recentCentres.fill(startAt);
			readySource = startAt;
		},

		/** Where in the source (seconds) the sample about to be read comes from. */
		get time() {
			// Until the jump is rendered, exactly where it asked to go (the first sample heard)
			if (fresh) return startSeconds;
			return (readySource + readyIndex * readySpeed) / sampleRate;
		},

		/** The song's length in seconds. */
		get duration() {
			return left.length / sampleRate;
		}
	};
}
