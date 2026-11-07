/**
 * How the metronome's rod moves on screen: it reaches one end on every
 * click and swings through the middle between, like a real pendulum.
 */

/** How far the rod swings each way (degrees). */
export const SWING_DEGREES = 24;

/**
 * The rod's angle `beats` after the first click (negative leans left).
 * @param {number} beats
 */
export function swingAngle(beats) {
	return -SWING_DEGREES * Math.cos(Math.PI * beats);
}
