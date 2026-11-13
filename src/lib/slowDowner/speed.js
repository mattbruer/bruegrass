/**
 * Playback speed for the transcribe page, as a fraction of the song's own
 * speed (1 = as recorded). The pitch never changes: see stretch/stretcher.js.
 */

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 1.5;
export const SPEED_STEP = 0.05;

/**
 * Keep a speed inside the range and on the step.
 * @param {number} speed
 * @returns {number}
 */
export function clampSpeed(speed) {
	const stepped = Math.round(speed / SPEED_STEP) * SPEED_STEP;
	const inRange = Math.min(MAX_SPEED, Math.max(MIN_SPEED, stepped));
	return Number(inRange.toFixed(2));
}
