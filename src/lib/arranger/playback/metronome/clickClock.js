/**
 * Shared by the band's click and the Metronome page: the level's range and
 * the clock a running click is drawn by (the pendulum swinging on the beat).
 */

/** The level's range, in dB. */
export const LEVEL_MIN_DB = -40;
export const LEVEL_MAX_DB = 0;

/** @param {number} db */
export function gainOf(db) {
	return 10 ** (db / 20);
}

/**
 * @param {typeof import('tone')} Tone
 * @param {{ origin: number, clock: import('../../chart/tempoCurve.js').TempoClock, grid: import('./clickGrid.js').ClickGrid }} clicks
 */
export function clickClock(Tone, { origin, clock, grid }) {
	if (grid.beats.length === 0) return null;
	const raw = /** @type {AudioContext} */ (/** @type {unknown} */ (Tone.getContext().rawContext));
	return {
		origin,
		/** @param {number} seconds since the first click */
		beatsAt: (seconds) => (clock.quartersAt(seconds) * grid.beats.length) / grid.lengthQuarters,
		// What's heard lags the audio clock by the output's latency (a lot, over Bluetooth)
		now: () => Tone.immediate() - (raw.outputLatency || 0)
	};
}
