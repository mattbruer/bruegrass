/**
 * The capo: which frets the arranger offers. Change MAX_CAPO here and the
 * Capo menu, saved arrangements and the ABC chord converter all follow.
 */

/** Highest capo position offered. Past the 5th fret, bluegrass players change shapes instead. */
export const MAX_CAPO = 5;

/** Every capo position you can pick, 0 (no capo) to MAX_CAPO. */
export const CAPO_CHOICES = Array.from({ length: MAX_CAPO + 1 }, (_, fret) => fret);

/**
 * A capo position you can actually pick (for values from saved data or typing).
 * @param {unknown} fret
 */
export function validCapo(fret) {
	const whole = Math.round(Number(fret)) || 0;
	return Math.min(MAX_CAPO, Math.max(0, whole));
}
