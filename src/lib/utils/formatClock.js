/**
 * Seconds as a clock reads them: 75.4 → "1:15", or with tenths "1:15.4".
 * @param {number} seconds
 * @param {{ tenths?: boolean }} [options]
 */
export function formatClock(seconds, { tenths = false } = {}) {
	const time = Math.max(0, seconds || 0);
	const whole = Math.floor(time);
	const minutes = Math.floor(whole / 60);
	const rest = String(whole % 60).padStart(2, '0');
	const tenth = tenths ? `.${Math.floor((time - whole) * 10)}` : '';
	return `${minutes}:${rest}${tenth}`;
}
