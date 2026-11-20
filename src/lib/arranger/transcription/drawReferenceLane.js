/**
 * The reference recording's lane drawn on a canvas as wide as the view:
 * only the pieces on screen. (One SVG as wide as the song, under a CSS
 * filter, vanished on an iPad: Safari drops a filtered layer that big.)
 */

/**
 * @typedef {{ left: number, width: number, wave: Float32Array }} WavePiece
 *   left and width in the lane's pixels; wave: each column's height, 0 to 1
 */

/**
 * @param {CanvasRenderingContext2D} context
 * @param {{ pieces: WavePiece[], from: number, width: number, height: number, colour: string }} view
 *   from: the lane's pixel at the canvas's left edge
 */
export function drawReferenceLane(context, { pieces, from, width, height, colour }) {
	context.clearRect(0, 0, width, height);
	const middle = height / 2;
	context.fillStyle = colour;
	context.beginPath();
	for (const piece of pieces) {
		if (piece.left + piece.width < from || piece.left > from + width) continue;
		outline(context, piece, piece.left - from, middle);
	}
	context.fill();
}

/**
 * A piece's outline: across its tops, back along its bottoms (as waveformPath).
 * @param {CanvasRenderingContext2D} context
 * @param {WavePiece} piece
 * @param {number} left on the canvas
 * @param {number} middle
 */
function outline(context, { width, wave }, left, middle) {
	if (wave.length === 0) return;
	const step = width / wave.length;
	const x = (/** @type {number} */ column) => left + column * step;
	const last = wave.length - 1;
	context.moveTo(x(0), middle - wave[0] * middle);
	for (let i = 0; i <= last; i++) context.lineTo(x(i + 0.5), middle - wave[i] * middle);
	context.lineTo(x(wave.length), middle - wave[last] * middle);
	context.lineTo(x(wave.length), middle + wave[last] * middle);
	for (let i = last; i >= 0; i--) context.lineTo(x(i + 0.5), middle + wave[i] * middle);
	context.lineTo(x(0), middle + wave[0] * middle);
	context.closePath();
}
