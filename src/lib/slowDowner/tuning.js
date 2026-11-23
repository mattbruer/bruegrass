/**
 * Fine tuning a recording: moving its pitch a few cents so its notes sit
 * on standard pitch (A = 440) instead of between two notes. A band tuned
 * to each other or to another A, or a copy played fast or slow, is off by
 * up to a semitone, so that's the range.
 */

export const MAX_CENTS = 100;

/**
 * Keep a tuning in range, on whole cents.
 * @param {number} cents
 */
export function clampCents(cents) {
	return Math.round(Math.min(MAX_CENTS, Math.max(-MAX_CENTS, cents))) || 0;
}

/**
 * The A this tuning puts the recording's A at, as players say it ("A = 436").
 * @param {number} cents the recording's own offset from A = 440
 */
export function concertA(cents) {
	return Math.round(440 * 2 ** (cents / 1200) * 10) / 10;
}
