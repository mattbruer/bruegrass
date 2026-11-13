/** The tempo range the arranger allows, in beats (quarter notes) per minute. */

export const TEMPO_MIN = 40;
export const TEMPO_MAX = 300;
export const TEMPO_DEFAULT = 120;

/**
 * Turn whatever was typed into a usable tempo: a whole number of BPM within
 * range. Anything unreadable (Safari lets letters into number fields) falls
 * back to the default.
 * @param {unknown} typed
 */
export function validTempo(typed) {
	const bpm = Math.round(Number(typed));
	if (!Number.isFinite(bpm) || bpm <= 0) return TEMPO_DEFAULT;
	return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, bpm));
}

/**
 * How long one quarter note lasts at this tempo. Every conversion between
 * the song's time (quarters) and the clock's (seconds) goes through this.
 * @param {number} bpm quarters per minute
 */
export function secondsPerQuarter(bpm) {
	return 60 / bpm;
}
