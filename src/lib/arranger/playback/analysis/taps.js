/**
 * Taps: listening points on the mixer, for meters and the visualiser. A tap
 * is an AnalyserNode hung off a channel's output; it doesn't change the
 * sound, it just lets the page read what's passing through.
 */

/** Samples per reading for levels and the waveform (~23 ms at 44.1 kHz). */
const WAVEFORM_SAMPLES = 1024;
/** Frequency bands for the spectrum (more = finer detail in the bass). */
const SPECTRUM_BANDS = 2048;
/** How much the spectrum smooths between readings (0 = jumpy, 1 = frozen). */
const SPECTRUM_SMOOTHING = 0.8;

/**
 * @typedef {{ read: () => { left: Float32Array, right: Float32Array } }} StereoTap
 *   the latest samples from each side (-1 to 1)
 * @typedef {{ read: () => Float32Array, bands: number, sampleRate: number }} SpectrumTap
 *   read: each band's level in dB, from 0 Hz up to half the sample rate
 */

/**
 * Listen to both sides of a stereo signal.
 * @param {typeof import('tone')} Tone
 * @param {import('tone').ToneAudioNode} source
 * @returns {StereoTap}
 */
export function createStereoTap(Tone, source) {
	const analyser = new Tone.Analyser({ type: 'waveform', size: WAVEFORM_SAMPLES, channels: 2 });
	source.connect(analyser);

	return {
		read() {
			const [left, right] = /** @type {Float32Array[]} */ (analyser.getValue());
			return { left, right };
		}
	};
}

/**
 * Listen to how loud each frequency is.
 * @param {typeof import('tone')} Tone
 * @param {import('tone').ToneAudioNode} source
 * @returns {SpectrumTap}
 */
export function createSpectrumTap(Tone, source) {
	const analyser = new Tone.Analyser({
		type: 'fft',
		size: SPECTRUM_BANDS,
		smoothing: SPECTRUM_SMOOTHING
	});
	source.connect(analyser);

	return {
		read: () => /** @type {Float32Array} */ (analyser.getValue()),
		bands: SPECTRUM_BANDS,
		sampleRate: Tone.getContext().sampleRate
	};
}
