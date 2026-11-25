/**
 * Where the band is *heard* right now, in seconds from bar 1: what the
 * films follow. The band's own position is the audio clock's (what it's
 * making now), and the speakers play that a little later (more on
 * Bluetooth), so a film following it unchanged would run ahead of the sound.
 * The metronome's pendulum allows for the same delay (clickClock.js).
 *
 * @param {() => number} quartersNow the band's position (PlayerState.melodyTimeNow; NaN: stopped)
 * @param {import('../chart/tempoCurve.js').TempoClock} clock the song's
 * @param {BaseAudioContext & { outputLatency?: number }} audio the band's context
 * @returns {number} NaN while stopped
 */
export function bandHeardAt(quartersNow, clock, audio) {
	const quarters = quartersNow();
	if (!Number.isFinite(quarters)) return NaN;
	return clock.secondsAt(quarters) - (audio.outputLatency || 0);
}
