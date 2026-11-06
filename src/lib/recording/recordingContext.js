/**
 * The audio context recordings are made in: its own native Web Audio
 * context (no Tone), at the same rate the app exports at, so a recorded
 * sample never needs converting before it's used or exported.
 */

/** Samples per second for everything recorded (matches export/renderSong.js). */
export const RECORDING_SAMPLE_RATE = 48000;

/**
 * A new context for recording. Call it from a click or key press: browsers
 * only let audio start after you've done something on the page.
 * Close it (`context.close()`) when you're done with it.
 */
export async function createRecordingContext() {
	const context = new AudioContext({
		sampleRate: RECORDING_SAMPLE_RATE,
		// Smallest buffers the device allows: meters and playback feel immediate
		latencyHint: 'interactive'
	});
	if (context.state !== 'running') await context.resume();
	return context;
}
