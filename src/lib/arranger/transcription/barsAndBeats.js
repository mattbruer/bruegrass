/**
 * Where the playhead is in bars and beats, as Logic's transport shows it:
 * the bar, the beat in it and the sixteenth in the beat (12, 3, 2). Beats
 * are the song's (strums: quarters). Before bar 1, in the lead-in, the bar
 * is 0 and its beats count up to bar 1's downbeat.
 */

/** Sixteenths in a beat. */
const DIVISIONS = 4;

/**
 * @param {number} beat where the playhead is, in beats from the first beat found (fractional)
 * @param {import('./barPlan.js').Bar[]} bars
 * @returns {{ bar: number, beat: number, division: number }}
 */
export function barsAndBeats(beat, bars) {
	const first = bars[0];
	if (!first) return { bar: 0, beat: 1, division: 1 };
	const bar =
		beat < first.firstBeat
			? { number: 0, firstBeat: first.firstBeat - first.beats, beats: first.beats }
			: (bars.findLast((each) => each.firstBeat <= beat) ?? first);
	const into = beat - bar.firstBeat;
	const whole = Math.floor(into);
	return {
		bar: bar.number,
		beat: Math.max(1, whole + 1),
		division: Math.min(DIVISIONS, Math.floor((into - whole) * DIVISIONS) + 1)
	};
}
