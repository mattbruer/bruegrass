/**
 * Looks at one frame of the source, centred on a sample, and measures every
 * frequency bin: each channel's spectrum, plus (on the two channels mixed)
 * its loudness, its phase, its exact frequency and where in the frame its
 * energy sits. Those last two come from the helper windows (reassignment),
 * so they don't depend on how far apart frames are: any speed works.
 *
 * Two real signals ride in one complex FFT, so a stereo frame costs two FFTs.
 */
import { createFft } from './fft.js';
import { createWindows } from './windows.js';

/**
 * @param {{ size: number, left: Float32Array, right: Float32Array }} source
 *   the whole song, one array per channel (the same array twice for mono)
 */
export function createFrameAnalyser({ size, left, right }) {
	const half = size / 2;
	const bins = half + 1;
	const mask = size - 1;
	const binFrequency = (2 * Math.PI) / size;
	const fft = createFft(size);
	const { window, derivative, timesTime } = createWindows(size);

	const channelsRe = new Float64Array(size);
	const channelsIm = new Float64Array(size);
	const helpersRe = new Float64Array(size);
	const helpersIm = new Float64Array(size);

	const frame = {
		leftRe: new Float64Array(bins),
		leftIm: new Float64Array(bins),
		rightRe: new Float64Array(bins),
		rightIm: new Float64Array(bins),
		magnitude: new Float64Array(bins),
		phase: new Float64Array(bins),
		frequency: new Float64Array(bins),
		phaseSlope: new Float64Array(bins)
	};

	/**
	 * Measure the frame centred on `centre` (a whole sample). Outside the song is silence.
	 * @param {number} centre
	 */
	function analyse(centre) {
		const start = centre - half;
		for (let k = 0; k < size; k++) {
			const i = start + k;
			const l = i >= 0 && i < left.length ? left[i] : 0;
			const r = i >= 0 && i < right.length ? right[i] : 0;
			const mid = (l + r) / 2;
			// Rotate so the frame's centre is sample 0: phases are then measured at the centre
			const j = (k + half) & mask;
			channelsRe[j] = l * window[k];
			channelsIm[j] = r * window[k];
			helpersRe[j] = mid * derivative[k];
			helpersIm[j] = mid * timesTime[k];
		}
		fft.forward(channelsRe, channelsIm);
		fft.forward(helpersRe, helpersIm);

		for (let m = 0; m < bins; m++) {
			const n = (size - m) & mask;
			// Split each packed FFT back into its two real signals' spectra
			const leftRe = (channelsRe[m] + channelsRe[n]) / 2;
			const leftIm = (channelsIm[m] - channelsIm[n]) / 2;
			const rightRe = (channelsIm[m] + channelsIm[n]) / 2;
			const rightIm = (channelsRe[n] - channelsRe[m]) / 2;
			const slopeRe = (helpersRe[m] + helpersRe[n]) / 2;
			const slopeIm = (helpersIm[m] - helpersIm[n]) / 2;
			const timeRe = (helpersIm[m] + helpersIm[n]) / 2;
			const timeIm = (helpersRe[n] - helpersRe[m]) / 2;

			frame.leftRe[m] = leftRe;
			frame.leftIm[m] = leftIm;
			frame.rightRe[m] = rightRe;
			frame.rightIm[m] = rightIm;

			const re = (leftRe + rightRe) / 2;
			const im = (leftIm + rightIm) / 2;
			const power = re * re + im * im;
			frame.magnitude[m] = Math.sqrt(power);
			frame.phase[m] = Math.atan2(im, re);

			if (power > 1e-30) {
				frame.frequency[m] = binFrequency * m - (slopeIm * re - slopeRe * im) / power;
				frame.phaseSlope[m] = -binFrequency * ((timeRe * re + timeIm * im) / power);
			} else {
				frame.frequency[m] = binFrequency * m;
				frame.phaseSlope[m] = 0;
			}
		}

		return frame;
	}

	return { analyse, bins };
}
