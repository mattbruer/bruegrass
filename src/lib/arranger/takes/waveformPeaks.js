/**
 * A take's waveform, small enough to draw: the loudest sample in each short
 * stretch of the audio, and that outline as an SVG path.
 */

/** How many peaks a second of audio becomes. */
export const PEAKS_PER_SECOND = 50;

/**
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @returns {Float32Array} 0 to 1, one per 1/PEAKS_PER_SECOND s
 */
export function waveformPeaks(channels, sampleRate) {
	const length = channels[0]?.length ?? 0;
	const stretch = Math.max(1, Math.round(sampleRate / PEAKS_PER_SECOND));
	const peaks = new Float32Array(Math.ceil(length / stretch));
	for (const samples of channels) {
		for (let i = 0; i < length; i++) {
			const level = Math.abs(samples[i]);
			const peak = (i / stretch) | 0;
			if (level > peaks[peak]) peaks[peak] = level;
		}
	}
	for (let i = 0; i < peaks.length; i++) peaks[i] = Math.min(1, peaks[i]);
	return peaks;
}

/**
 * The outline, mirrored about the middle, in a box `peaks.length` wide and
 * 2 high (draw it with `viewBox="0 -1 {peaks.length} 2"`, stretched to fit).
 * @param {Float32Array} peaks
 */
export function waveformPath(peaks) {
	if (peaks.length === 0) return '';
	const top = Array.from(peaks, (peak, i) => `${i} ${(-peak).toFixed(3)}`);
	const bottom = Array.from(peaks, (peak, i) => `${i} ${peak.toFixed(3)}`).reverse();
	return `M${top.join('L')}L${bottom.join('L')}Z`;
}
