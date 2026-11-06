/**
 * Drawing the EQ graph: the grid, the live analyser behind it, the EQ's
 * response curve, and a dot for each band (where you grab it).
 */
import { EQ_BANDS, isCut } from '../../../playback/eq/eqBands.js';
import { eqResponseDb } from '../../../playback/eq/eqResponse.js';
import {
	GRID_FREQUENCIES,
	GRID_GAINS,
	curveFrequencies,
	formatFrequency,
	xForFrequency,
	yForGain
} from './eqGraphScale.js';

/* The analyser's range: quieter than QUIETEST_DB isn't drawn */
const QUIETEST_DB = -90;
const LOUDEST_DB = -10;
/** Band dots' size, in CSS pixels. */
export const HANDLE_RADIUS = 6;
/** Below this width (CSS px) the frequency labels are thinned out. */
const NARROW_GRAPH_WIDTH = 480;

/**
 * @typedef {{ curve: string, faint: string, label: string, analyser: string, bands: string[] }} EqColours
 *   bands: one colour per band, in EQ_BANDS order
 */

/**
 * The theme and band colours, read from CSS (a canvas can't use CSS variables).
 * @param {Element} element
 * @returns {EqColours}
 */
export function eqColours(element) {
	const styles = getComputedStyle(element);
	const read = (/** @type {string} */ name) => styles.getPropertyValue(name).trim();
	return {
		curve: read('--color-ink'),
		faint: read('--color-ink-faint'),
		label: read('--color-ink-soft'),
		analyser: read('--color-accent'),
		bands: EQ_BANDS.map((_, index) => read(`--eq-band-${index + 1}`))
	};
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 * @param {EqColours} colours
 */
export function drawGrid(context, width, height, colours) {
	context.lineWidth = 1;
	context.strokeStyle = colours.faint;
	context.fillStyle = colours.label;
	context.font = '10px ui-monospace, monospace';
	context.globalAlpha = 0.35;

	// On narrow screens label every other line, so the labels don't run together
	const labelEvery = width < NARROW_GRAPH_WIDTH ? 2 : 1;
	GRID_FREQUENCIES.forEach((hz, i) => {
		const x = xForFrequency(hz, width);
		line(context, x, 0, x, height);
		if (i % labelEvery === 0) {
			context.fillText(formatFrequency(hz).replace(' ', ''), x + 3, height - 4);
		}
	});
	for (const db of GRID_GAINS) {
		const y = yForGain(db, height);
		context.globalAlpha = db === 0 ? 0.7 : 0.35; // the 0 dB line stands out
		line(context, 0, y, width, y);
		context.fillText(`${db > 0 ? '+' : ''}${db}`, 3, y - 3);
	}
	context.globalAlpha = 1;
}

/**
 * The sound right now, after the EQ, as a soft filled shape.
 * @param {CanvasRenderingContext2D} context
 * @param {Float32Array} bandsDb levels from 0 Hz up to half the sample rate
 * @param {number} sampleRate
 * @param {number} width
 * @param {number} height
 * @param {EqColours} colours
 */
export function drawAnalyser(context, bandsDb, sampleRate, width, height, colours) {
	const hzPerBand = sampleRate / 2 / bandsDb.length;
	const frequencies = curveFrequencies(width);

	context.beginPath();
	context.moveTo(0, height);
	for (const hz of frequencies) {
		const level = bandsDb[Math.min(bandsDb.length - 1, Math.round(hz / hzPerBand))];
		const loudness = Math.min(1, Math.max(0, (level - QUIETEST_DB) / (LOUDEST_DB - QUIETEST_DB)));
		context.lineTo(xForFrequency(hz, width), height - loudness * height);
	}
	context.lineTo(width, height);
	context.closePath();
	context.globalAlpha = 0.18;
	context.fillStyle = colours.analyser;
	context.fill();
	context.globalAlpha = 1;
}

/**
 * The EQ's overall response: what it does to each frequency.
 * @param {CanvasRenderingContext2D} context
 * @param {import('../../../playback/eq/eqBands.js').EqSettings} eq
 * @param {number} sampleRate
 * @param {number} width
 * @param {number} height
 * @param {EqColours} colours
 */
export function drawResponse(context, eq, sampleRate, width, height, colours) {
	const frequencies = curveFrequencies(width);
	const response = eqResponseDb(eq, frequencies, sampleRate);

	context.beginPath();
	frequencies.forEach((hz, i) => {
		const x = xForFrequency(hz, width);
		const y = Math.min(height + 2, yForGain(response[i], height)); // cuts dive off the bottom
		if (i === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	});
	context.strokeStyle = colours.curve;
	context.lineWidth = 2;
	context.globalAlpha = eq.enabled ? 1 : 0.35;
	context.stroke();
	context.globalAlpha = 1;
}

/**
 * Where each band's dot sits: its frequency across, its gain up (cuts sit
 * on the 0 dB line, having no gain).
 * @param {import('../../../playback/eq/eqBands.js').EqSettings} eq
 * @param {number} width
 * @param {number} height
 */
export function handlePositions(eq, width, height) {
	return eq.bands.map((band, index) => ({
		id: band.id,
		index,
		x: xForFrequency(band.frequency, width),
		y: yForGain(isCut(EQ_BANDS[index].shape) ? 0 : band.gain, height)
	}));
}

/**
 * A dot per band: filled when on, an outline when off, ringed when selected.
 * @param {CanvasRenderingContext2D} context
 * @param {import('../../../playback/eq/eqBands.js').EqSettings} eq
 * @param {string | null} selectedId
 * @param {number} width
 * @param {number} height
 * @param {EqColours} colours
 */
export function drawHandles(context, eq, selectedId, width, height, colours) {
	for (const handle of handlePositions(eq, width, height)) {
		const band = eq.bands[handle.index];
		const colour = colours.bands[handle.index];
		context.beginPath();
		context.arc(handle.x, handle.y, HANDLE_RADIUS, 0, Math.PI * 2);
		context.fillStyle = colour;
		context.strokeStyle = colour;
		context.lineWidth = 2;
		if (band.on && eq.enabled) context.fill();
		else context.stroke();

		if (handle.id === selectedId) {
			context.beginPath();
			context.arc(handle.x, handle.y, HANDLE_RADIUS + 4, 0, Math.PI * 2);
			context.strokeStyle = colours.curve;
			context.lineWidth = 1.5;
			context.stroke();
		}
	}
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 */
function line(context, x1, y1, x2, y2) {
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
}
