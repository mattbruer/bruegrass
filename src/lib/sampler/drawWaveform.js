/**
 * Draw a take's waveform on a canvas: one lane per channel (per mic), each
 * column showing the loudest and quietest sample under it, so no peak is
 * hidden however long the take is.
 */

/** Gap between lanes, in CSS pixels. */
const LANE_GAP = 6;

/**
 * @param {HTMLCanvasElement} canvas sized by CSS; this matches its pixels to the screen
 * @param {Float32Array[]} channels
 */
export function drawWaveform(canvas, channels) {
	const scale = window.devicePixelRatio || 1;
	const width = Math.round(canvas.clientWidth * scale);
	const height = Math.round(canvas.clientHeight * scale);
	canvas.width = width;
	canvas.height = height;

	const paint = canvas.getContext('2d');
	if (!paint) return;
	paint.clearRect(0, 0, width, height);
	if (channels.length === 0) return;

	const styles = getComputedStyle(canvas);
	const waveColour = styles.getPropertyValue('--color-accent');
	const lineColour = styles.getPropertyValue('--color-ink-faint');

	const gap = LANE_GAP * scale;
	const laneHeight = (height - gap * (channels.length - 1)) / channels.length;

	channels.forEach((samples, lane) => {
		const top = lane * (laneHeight + gap);
		const middle = top + laneHeight / 2;
		const half = laneHeight / 2;

		// The zero line
		paint.fillStyle = lineColour;
		paint.fillRect(0, Math.round(middle), width, Math.max(1, scale / 2));

		paint.fillStyle = waveColour;
		const perColumn = samples.length / width;
		for (let x = 0; x < width; x++) {
			const from = Math.floor(x * perColumn);
			const to = Math.max(from + 1, Math.floor((x + 1) * perColumn));
			let low = 0;
			let high = 0;
			for (let i = from; i < to && i < samples.length; i++) {
				if (samples[i] < low) low = samples[i];
				if (samples[i] > high) high = samples[i];
			}
			const y = middle - high * half;
			paint.fillRect(x, y, 1, Math.max(1, (high - low) * half));
		}
	});
}
