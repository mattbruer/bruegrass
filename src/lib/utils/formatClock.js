/**
 * Seconds as a clock reads them: 75.43 → "1:15", or with decimals 2 "1:15.43".
 * @param {number} seconds
 * @param {{ decimals?: number }} [options] decimals: places after the seconds (0: none)
 */
export function formatClock(seconds, { decimals = 0 } = {}) {
	const scale = 10 ** decimals;
	const steps = Math.floor(Math.max(0, seconds || 0) * scale);
	const whole = Math.floor(steps / scale);
	const minutes = Math.floor(whole / 60);
	const rest = String(whole % 60).padStart(2, '0');
	const part = decimals > 0 ? `.${String(steps % scale).padStart(decimals, '0')}` : '';
	return `${minutes}:${rest}${part}`;
}
