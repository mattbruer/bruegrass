/**
 * Swing: the eighth notes played long-short instead of even. Measured the
 * drum machines' way, as where the second eighth of each beat lands, in
 * percent of the beat: 50 is straight, 66 a triplet feel, 75 dotted.
 */

export const SWING_STRAIGHT = 50;
export const SWING_MAX = 75;

/**
 * Where a moment of straight time lands once swung. Each beat is bent so its
 * first half stretches over `swing`% of it and the second half squeezes into
 * the rest; the beat's start and end don't move.
 * @param {number} seconds straight time, from a beat (bar 1, a pass's start)
 * @param {number} quarter seconds per quarter note
 * @param {number} swing percent, SWING_STRAIGHT to SWING_MAX
 */
export function swungTime(seconds, quarter, swing) {
	if (swing === SWING_STRAIGHT) return seconds;
	const beats = seconds / quarter;
	const beat = Math.floor(beats);
	const into = beats - beat;
	const firstHalf = swing / 100;
	const bent = into < 0.5 ? into * 2 * firstHalf : firstHalf + (into - 0.5) * 2 * (1 - firstHalf);
	return (beat + bent) * quarter;
}

/**
 * Whatever was set, as a usable swing: a whole percent in range.
 * @param {unknown} value
 */
export function validSwing(value) {
	const swing = Math.round(Number(value));
	if (!Number.isFinite(swing)) return SWING_STRAIGHT;
	return Math.min(SWING_MAX, Math.max(SWING_STRAIGHT, swing));
}
