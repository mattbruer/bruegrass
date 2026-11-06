/**
 * The spectrum view: how loud each frequency is, bass on the left, treble
 * on the right. Frequencies are spaced like a piano (each octave the same
 * width), which is how we hear pitch.
 */

/* What the view covers */
const LOWEST_HZ = 30;
const HIGHEST_HZ = 16000;
const QUIETEST_DB = -100;
const LOUDEST_DB = -10;
/** Frequencies to mark on the grid. */
const GRID_HZ = [100, 1000, 10000];

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Float32Array} bandsDb each band's level, 0 Hz up to half the sample rate
 * @param {number} sampleRate
 * @param {number} width
 * @param {number} height
 * @param {import('./canvas.js').ScopeColours} colours
 */
export function drawSpectrum(context, bandsDb, sampleRate, width, height, colours) {
	drawGrid(context, width, height, colours);

	const hzPerBand = sampleRate / 2 / bandsDb.length;
	const yFor = (/** @type {number} */ db) => {
		const loudness = (db - QUIETEST_DB) / (LOUDEST_DB - QUIETEST_DB);
		return height - Math.min(1, Math.max(0, loudness)) * height;
	};

	context.beginPath();
	context.moveTo(0, height);
	for (let x = 0; x <= width; x++) {
		const hz = frequencyAt(x / width);
		const band = Math.min(bandsDb.length - 1, Math.round(hz / hzPerBand));
		context.lineTo(x, yFor(bandsDb[band]));
	}
	context.lineTo(width, height);
	context.closePath();

	context.globalAlpha = 0.25;
	context.fillStyle = colours.line;
	context.fill();
	context.globalAlpha = 1;
	context.strokeStyle = colours.line;
	context.lineWidth = 1.5;
	context.stroke();
}

/**
 * The frequency at a point across the view (0 = left edge, 1 = right edge).
 * @param {number} across
 */
function frequencyAt(across) {
	return LOWEST_HZ * (HIGHEST_HZ / LOWEST_HZ) ** across;
}

/**
 * @param {number} hz
 */
function positionOf(hz) {
	return Math.log(hz / LOWEST_HZ) / Math.log(HIGHEST_HZ / LOWEST_HZ);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 * @param {import('./canvas.js').ScopeColours} colours
 */
function drawGrid(context, width, height, colours) {
	context.font = '10px ui-monospace, monospace';
	context.fillStyle = colours.label;
	context.strokeStyle = colours.faint;
	context.lineWidth = 1;
	context.globalAlpha = 0.5;

	for (const hz of GRID_HZ) {
		const x = positionOf(hz) * width;
		context.beginPath();
		context.moveTo(x, 0);
		context.lineTo(x, height);
		context.stroke();
		context.fillText(hz >= 1000 ? `${hz / 1000}k` : `${hz}`, x + 3, 11);
	}
	context.globalAlpha = 1;
}
