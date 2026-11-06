/**
 * How the output stage's numbers are shown: one decimal, a real minus sign,
 * and a dash when there's nothing to show (silence, or not measured yet).
 */

/** @param {number} value */
export function formatLufs(value) {
	return isFinite(value) ? withMinusSign(value.toFixed(1)) : '–';
}

/** @param {number} db gain reduction, 0 or less */
export function formatReduction(db) {
	return db < -0.05 ? withMinusSign(db.toFixed(1)) : '0.0';
}

/** @param {string} text */
function withMinusSign(text) {
	return text.replace('-', '−');
}
