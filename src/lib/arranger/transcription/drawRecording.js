/**
 * The recording drawn on a canvas, from its own samples: only the stretch
 * on screen, one column per pixel, so it can zoom in as far as you like
 * (down to single samples) and stay sharp. The waveform swings above and
 * below its zero line, as the samples do (scaled so the recording's
 * loudest moment nearly fills the lane): each column from its lowest to
 * its highest sample (the channels mixed), or, zoomed in past one sample a
 * pixel, a line through the samples themselves. A time is
 * written every so often.
 */
import { WAVE_FILL } from './recordingShape.js';

/** Times are written about this far apart (px), on a round number of seconds. */
const TICK_SPACING = 110;
const TICK_STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60];

/**
 * @typedef {{ wave: string, line: string, text: string }} Colours
 */

/**
 * @param {CanvasRenderingContext2D} context
 * @param {{
 *   audio: AudioBuffer | null, from: number,
 *   pixelsPerSecond: number, width: number, height: number, colours: Colours
 * }} view from: the second at the canvas's left edge
 */
export function drawRecording(context, view) {
	const { width, height } = view;
	context.clearRect(0, 0, width, height);
	if (view.audio) drawWave(context, view);
	drawTicks(context, view);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Parameters<typeof drawRecording>[1]} view
 */
function drawWave(context, { audio, from, pixelsPerSecond, width, height, colours }) {
	if (!audio) return;
	const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
		audio.getChannelData(i)
	);
	const samplesPerPixel = audio.sampleRate / pixelsPerSecond;
	const zero = height / 2;
	const scale = WAVE_FILL / loudestOf(audio, channels);
	const y = (/** @type {number} */ value) => zero - Math.max(-1, Math.min(1, value * scale)) * zero;

	context.fillStyle = colours.line;
	context.fillRect(0, Math.round(zero), width, 1);
	context.fillStyle = colours.wave;
	context.strokeStyle = colours.wave;

	if (samplesPerPixel < 1) {
		// Zoomed in past single samples: a line through them
		const first = Math.floor(from * audio.sampleRate);
		const last = Math.ceil((from + width / pixelsPerSecond) * audio.sampleRate);
		context.lineWidth = 1.5;
		context.beginPath();
		for (let i = first; i <= last; i++) {
			const x = (i / audio.sampleRate - from) * pixelsPerSecond;
			if (i === first) context.moveTo(x, y(mixed(channels, i)));
			else context.lineTo(x, y(mixed(channels, i)));
		}
		context.stroke();
		return;
	}
	for (let x = 0; x < width; x++) {
		const start = Math.floor((from + x / pixelsPerSecond) * audio.sampleRate);
		const end = Math.max(start + 1, Math.floor(start + samplesPerPixel));
		const { low, high } = rangeBetween(channels, start, end);
		const top = y(high);
		context.fillRect(x, top, 1, Math.max(1, y(low) - top));
	}
}

/** Each recording's loudest mixed sample, found once: the waveform is drawn to fill the lane. */
const loudest = new WeakMap();

/**
 * @param {AudioBuffer} audio
 * @param {Float32Array[]} channels
 */
function loudestOf(audio, channels) {
	if (!loudest.has(audio)) {
		const { low, high } = rangeBetween(channels, 0, audio.length, 1);
		loudest.set(audio, Math.max(high, -low, 1e-6));
	}
	return loudest.get(audio);
}

/**
 * The channels mixed at one sample (0 outside the recording).
 * @param {Float32Array[]} channels
 * @param {number} index
 */
function mixed(channels, index) {
	let sum = 0;
	for (const samples of channels) sum += samples[index] ?? 0;
	return sum / channels.length;
}

/**
 * The lowest and highest mixed sample in a stretch (a long stretch is
 * sampled, to stay quick).
 * @param {Float32Array[]} channels
 * @param {number} start
 * @param {number} end
 * @param {number} [step] every this many samples (default: about 256 looks a stretch)
 */
function rangeBetween(channels, start, end, step = Math.max(1, Math.floor((end - start) / 256))) {
	let low = 0;
	let high = 0;
	for (let i = Math.max(0, start); i < end; i += step) {
		const value = mixed(channels, i);
		if (value < low) low = value;
		if (value > high) high = value;
	}
	return { low, high };
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Parameters<typeof drawRecording>[1]} view
 */
function drawTicks(context, { from, pixelsPerSecond, width, height, colours }) {
	const step = TICK_STEPS.find((each) => each * pixelsPerSecond >= TICK_SPACING) ?? 60;
	context.fillStyle = colours.text;
	context.strokeStyle = colours.line;
	context.font = '11px system-ui, sans-serif';
	context.textBaseline = 'top';
	for (
		let time = Math.ceil(from / step) * step;
		time < from + width / pixelsPerSecond;
		time += step
	) {
		const x = Math.round((time - from) * pixelsPerSecond) + 0.5;
		context.beginPath();
		context.moveTo(x, 0);
		context.lineTo(x, height);
		context.stroke();
		context.fillText(timeLabel(time, step), x + 3, 3);
	}
}

/**
 * @param {number} seconds
 * @param {number} step the gap between times (decimals shown when it's under a second)
 */
function timeLabel(seconds, step) {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds - minutes * 60;
	const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
	const text = rest.toFixed(decimals);
	return `${minutes}:${rest < 10 ? '0' : ''}${text}`;
}
