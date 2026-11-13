/** Moving through the recording a bar at a time, like a CD player's skip buttons. */

/** Back, this soon after a bar starts, goes to the bar before instead of this one's start. */
const JUST_STARTED_SECONDS = 0.5;

/**
 * Where a step lands: forward, the next bar's start; back, this bar's
 * start (or the one before, if this bar has only just started). Before the
 * first bar, back goes to the very start.
 * @param {number[]} starts each bar's start (seconds), in order
 * @param {number} now seconds into the recording
 * @param {1 | -1} step
 * @returns {number | null} null: nowhere further to go
 */
export function barStepTarget(starts, now, step) {
	if (step > 0) return starts.find((start) => start > now + 0.001) ?? null;
	return starts.findLast((start) => start < now - JUST_STARTED_SECONDS) ?? 0;
}
