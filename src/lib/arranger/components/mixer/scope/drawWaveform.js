/**
 * The waveform view: an oscilloscope of the master output, left and right
 * mixed together. Each frame starts where the wave rises through zero, so
 * steady notes stand still on screen instead of jittering.
 */

/** How much of each reading to show (the rest leaves room to find a starting point). */
const SHOWN_FRACTION = 0.5;

/**
 * @param {CanvasRenderingContext2D} context
 * @param {{ left: Float32Array, right: Float32Array }} samples
 * @param {number} width
 * @param {number} height
 * @param {import('./canvas.js').ScopeColours} colours
 */
export function drawWaveform(context, { left, right }, width, height, colours) {
	const middle = height / 2;
	drawCentreLine(context, width, middle, colours.faint);

	const shown = Math.floor(left.length * SHOWN_FRACTION);
	const start = risingZeroCrossing(left, right, left.length - shown);

	context.beginPath();
	for (let i = 0; i < shown; i++) {
		const sample = (left[start + i] + right[start + i]) / 2;
		const x = (i / (shown - 1)) * width;
		const y = middle - sample * middle;
		if (i === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	}
	context.strokeStyle = colours.line;
	context.lineWidth = 1.5;
	context.stroke();
}

/**
 * Where the (mixed) wave first goes from below zero to zero or above.
 * @param {Float32Array} left
 * @param {Float32Array} right
 * @param {number} searchUpTo
 */
function risingZeroCrossing(left, right, searchUpTo) {
	for (let i = 1; i < searchUpTo; i++) {
		const before = left[i - 1] + right[i - 1];
		const now = left[i] + right[i];
		if (before < 0 && now >= 0) return i;
	}
	return 0;
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} y
 * @param {string} colour
 */
function drawCentreLine(context, width, y, colour) {
	context.beginPath();
	context.moveTo(0, y);
	context.lineTo(width, y);
	context.strokeStyle = colour;
	context.lineWidth = 1;
	context.stroke();
}
