/**
 * Seconds as a clock reads them: 75.4 → "1:15".
 * @param {number} seconds
 */
export function formatClock(seconds) {
	const whole = Math.floor(seconds || 0);
	const minutes = Math.floor(whole / 60);
	const rest = String(whole % 60).padStart(2, '0');
	return `${minutes}:${rest}`;
}
