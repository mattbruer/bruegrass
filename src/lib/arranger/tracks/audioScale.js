/**
 * Audio on the tracks: the lanes are drawn in quarter notes (the ruler's
 * bars), audio is in seconds, and the tempo lane can bend one against the
 * other (a ritard). Turns a place in the song in seconds into pixels across
 * the lanes, and back, through the song's clock.
 * @param {ReturnType<typeof import('./trackScale.js').trackScale>} scale
 * @param {import('../chart/tempoCurve.js').TempoClock} clock
 */
export function audioScale(scale, clock) {
	return {
		/** @param {number} seconds from bar 1 */
		xAt: (seconds) => scale.toX(clock.quartersAt(seconds)),
		/** @param {number} x pixels into the lanes */
		secondsAt: (x) => clock.secondsAt(scale.start + scale.toQuarters(x))
	};
}
