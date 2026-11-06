/**
 * The stereo view (a "goniometer", as on a mastering desk): every sample is
 * a dot, placed by how alike left and right are.
 *
 *   - Sound in the centre (the same in both speakers) draws a vertical line.
 *   - Sound panned left or right leans towards the L or R diagonal.
 *   - A wide, roomy mix (like reverb) spreads into a cloud.
 *   - A flat horizontal smear means left and right are cancelling out.
 */

/** Enlarges the picture: a typical mix doesn't reach full scale. */
const ZOOM = 2.5;
/** How see-through each dot is (lots of dots build up where the sound is). */
const DOT_OPACITY = 0.35;

/**
 * @param {CanvasRenderingContext2D} context
 * @param {{ left: Float32Array, right: Float32Array }} samples
 * @param {number} width
 * @param {number} height
 * @param {import('./canvas.js').ScopeColours} colours
 */
export function drawStereoField(context, { left, right }, width, height, colours) {
	const centreX = width / 2;
	const centreY = height / 2;
	const radius = Math.min(width, height) / 2;

	drawGuides(context, centreX, centreY, radius, colours);

	context.fillStyle = colours.line;
	context.globalAlpha = DOT_OPACITY;
	for (let i = 0; i < left.length; i++) {
		// Turn left/right into "what they share" (up) and "how they differ" (across)
		const shared = (left[i] + right[i]) * Math.SQRT1_2;
		const different = (left[i] - right[i]) * Math.SQRT1_2;
		const x = centreX - different * radius * ZOOM;
		const y = centreY - shared * radius * ZOOM;
		context.fillRect(x, y, 1.5, 1.5);
	}
	context.globalAlpha = 1;
}

/**
 * The centre line and the L and R diagonals, labelled.
 * @param {CanvasRenderingContext2D} context
 * @param {number} centreX
 * @param {number} centreY
 * @param {number} radius
 * @param {import('./canvas.js').ScopeColours} colours
 */
function drawGuides(context, centreX, centreY, radius, colours) {
	const diagonal = radius * Math.SQRT1_2;
	context.strokeStyle = colours.faint;
	context.lineWidth = 1;
	context.globalAlpha = 0.5;
	context.beginPath();
	context.moveTo(centreX, centreY - radius);
	context.lineTo(centreX, centreY + radius);
	context.moveTo(centreX - diagonal, centreY - diagonal);
	context.lineTo(centreX + diagonal, centreY + diagonal);
	context.moveTo(centreX + diagonal, centreY - diagonal);
	context.lineTo(centreX - diagonal, centreY + diagonal);
	context.stroke();

	context.globalAlpha = 1;
	context.fillStyle = colours.label;
	context.font = '10px ui-monospace, monospace';
	context.fillText('L', centreX - diagonal - 10, centreY - diagonal);
	context.fillText('R', centreX + diagonal + 4, centreY - diagonal);
	context.fillText('M', centreX + 4, centreY - radius + 10);
}
