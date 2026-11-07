/**
 * Plays a click grid (clickGrid.js) on the audio clock, over and over, until
 * stopped. Clicks are queued a little ahead, the same way the band is, so
 * they never drift.
 *
 * Only one clicker sounds at a time: starting one stops the last, so a
 * leftover from an old module (after a hot reload) can never double up.
 */
import { clickBuffers } from './sounds.js';

/** Queue clicks this far ahead of the audio clock (seconds). */
const LOOKAHEAD = 2;
/** Seconds between queuing runs. */
const TICK = 0.1;

/** Stops the clicker that's sounding (a no-op when none is). */
let stopSounding = () => {};

/**
 * @param {typeof import('tone')} Tone
 * @param {{
 *   grid: import('./clickGrid.js').ClickGrid,
 *   sound: import('./sounds.js').ClickSound,
 *   origin: number, quarterSeconds: number,
 *   destination: import('tone').ToneAudioNode
 * }} run origin: the audio-clock time of the first pass's top; quarterSeconds: one quarter note
 * @returns {() => void} stop
 */
export function startClicks(Tone, { grid, sound, origin, quarterSeconds, destination }) {
	stopSounding();
	if (grid.beats.length === 0) return () => {};

	const context = Tone.getContext();
	const buffers = clickBuffers(context, sound);
	const passSeconds = grid.lengthQuarters * quarterSeconds;
	/** @type {Set<AudioBufferSourceNode>} */
	const sounding = new Set();
	let nextIndex = 0;
	/** @type {number | undefined} */
	let timer;
	let stopped = false;

	/** When click number `index` (counting on through every pass) falls. */
	function clickAt(index) {
		const { at, accent } = grid.beats[index % grid.beats.length];
		const pass = Math.floor(index / grid.beats.length);
		return { time: origin + pass * passSeconds + at * quarterSeconds, accent };
	}

	/** @param {{ time: number, accent: boolean }} click */
	function playClick({ time, accent }) {
		const source = context.createBufferSource();
		source.buffer = accent ? buffers.accent : buffers.beat;
		Tone.connect(source, destination);
		source.start(time);
		sounding.add(source);
		source.onended = () => {
			sounding.delete(source);
			source.disconnect();
		};
	}

	function tick() {
		if (stopped) return;
		const horizon = Tone.now() + LOOKAHEAD;
		let click = clickAt(nextIndex);
		while (click.time < horizon) {
			nextIndex++;
			if (click.time >= Tone.now()) playClick(click); // never a click that's already gone
			click = clickAt(nextIndex);
		}
		timer = context.setTimeout(tick, TICK);
	}

	function stop() {
		stopped = true;
		if (timer !== undefined) context.clearTimeout(timer);
		for (const source of sounding) source.stop();
		if (stopSounding === stop) stopSounding = () => {};
	}

	stopSounding = stop;
	tick();
	return stop;
}

// A hot reload replaces this module: stop whatever it started, or it keeps clicking unseen
if (import.meta.hot) import.meta.hot.dispose(() => stopSounding());
