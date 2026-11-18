/**
 * Smoothing for the needle: the One Euro filter (Casiez, Roussel & Vogel,
 * 2012), a low-pass whose cutoff rises with speed. Still on a held note,
 * quick when you turn the peg. In cents, so it feels the same on every note.
 */

/** The cutoff while the needle's still (Hz): lower is steadier. */
const STILL_CUTOFF = 1.5;
/** How much the cutoff rises with speed (per cent a second): higher follows a turn faster. */
const SPEED_RAISES_CUTOFF = 0.05;
const SPEED_CUTOFF = 1;

export function createNeedleFilter() {
	/** @type {number | null} */
	let value = null;
	let speed = 0;

	return {
		/**
		 * @param {number} target the latest cents
		 * @param {number} elapsed seconds since the last frame
		 */
		next(target, elapsed) {
			if (value === null || elapsed <= 0) return (value = target);
			speed += smoothing(SPEED_CUTOFF, elapsed) * ((target - value) / elapsed - speed);
			const cutoff = STILL_CUTOFF + SPEED_RAISES_CUTOFF * Math.abs(speed);
			return (value += smoothing(cutoff, elapsed) * (target - value));
		},
		/** Start afresh (a new note: no sweeping across from the old one). */
		reset() {
			value = null;
			speed = 0;
		}
	};
}

/** @param {number} cutoff Hz @param {number} elapsed seconds */
function smoothing(cutoff, elapsed) {
	const timeConstant = 1 / (2 * Math.PI * cutoff);
	return 1 / (1 + timeConstant / elapsed);
}
