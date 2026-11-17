/**
 * The recording's tempo as the beats found say it goes: one reading per gap
 * between beats, and one per bar (its beats over its length). Beat to beat
 * it jitters (strums are human, and beats sit on the analysis's frames);
 * a bar's average is steady, so a bar far from the usual tempo is where to
 * listen: the band drifting, or the beat finder losing its place.
 */

/** A bar further than this (a fraction) from the usual tempo is pointed out. */
export const OFF_TEMPO = 0.05;

/**
 * The tempo of each gap between beats, at the gap's middle.
 * @param {number[]} beats seconds
 * @returns {{ beat: number, bpm: number }[]} beat: where the gap's middle falls (2.5 = between beats 2 and 3)
 */
export function tempoByBeat(beats) {
	return beats.slice(1).map((next, i) => ({ beat: i + 0.5, bpm: 60 / (next - beats[i]) }));
}

/**
 * The average tempo of each bar.
 * @param {number[]} beats seconds
 * @param {import('../barPlan.js').Bar[]} bars
 */
export function tempoByBar(beats, bars) {
	return bars
		.filter((bar) => beats[bar.firstBeat + bar.beats] !== undefined)
		.map((bar) => ({
			number: bar.number,
			from: bar.firstBeat,
			to: bar.firstBeat + bar.beats,
			bpm: (60 * bar.beats) / (beats[bar.firstBeat + bar.beats] - beats[bar.firstBeat])
		}));
}

/**
 * The tempo most of the song sits at (the median).
 * @param {{ bpm: number }[]} readings
 */
export function usualTempo(readings) {
	if (!readings.length) return 0;
	const sorted = readings.map((reading) => reading.bpm).sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

/**
 * @param {number} bpm
 * @param {number} usual
 */
export function isOffTempo(bpm, usual) {
	return Math.abs(bpm / usual - 1) > OFF_TEMPO;
}
