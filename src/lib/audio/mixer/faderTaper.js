/**
 * How fader travel maps to level, like a real console: unity gain (0 dB,
 * the signal unchanged) sits three quarters of the way up, the top quarter
 * is boost, most of the lower travel covers the useful -30 to 0 dB, and
 * the bottom is silence.
 */

/** At or below this the fader is silent. */
export const FADER_MIN = -60;
export const FADER_MAX = 6;

/** Fader position of unity gain. */
export const UNITY = 0.75;

/** Within this many dB of unity, the fader clicks onto it (a detent). */
const UNITY_DETENT_DB = 0.4;

/** Points along the travel as [position 0–1, dB]; between them it's linear. */
const TAPER = [
	[0, FADER_MIN],
	[0.05, -50],
	[0.15, -40],
	[0.25, -30],
	[0.35, -20],
	[0.5, -10],
	[0.625, -5],
	[UNITY, 0],
	[1, FADER_MAX]
];

/**
 * Fader position (0–1) for a level in dB.
 * @param {number} db
 */
export function dbToFader(db) {
	if (db <= FADER_MIN) return 0;
	for (let i = 1; i < TAPER.length; i++) {
		const [fromPosition, fromDb] = TAPER[i - 1];
		const [toPosition, toDb] = TAPER[i];
		if (db <= toDb)
			return fromPosition + ((db - fromDb) / (toDb - fromDb)) * (toPosition - fromPosition);
	}
	return 1;
}

/**
 * Level in dB for a fader position (0–1), rounded to 0.1 dB, clicking onto unity.
 * @param {number} position
 */
export function faderToDb(position) {
	if (position <= 0) return FADER_MIN;
	for (let i = 1; i < TAPER.length; i++) {
		const [fromPosition, fromDb] = TAPER[i - 1];
		const [toPosition, toDb] = TAPER[i];
		if (position <= toPosition) {
			const db =
				fromDb + ((position - fromPosition) / (toPosition - fromPosition)) * (toDb - fromDb);
			return Math.abs(db) < UNITY_DETENT_DB ? 0 : Math.round(db * 10) / 10;
		}
	}
	return FADER_MAX;
}

/**
 * The gain to give an audio node for a fader level (the bottom is true silence).
 * @param {number} db
 */
export function faderGain(db) {
	return db <= FADER_MIN ? -Infinity : db;
}

/**
 * A level for a readout: "-∞", "0.0", "+3.5".
 * @param {number} db
 */
export function formatDb(db) {
	if (db <= FADER_MIN) return '-∞';
	return `${db > 0 ? '+' : ''}${db.toFixed(1)}`;
}
