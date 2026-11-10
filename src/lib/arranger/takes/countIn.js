/**
 * The count-in before a recorded take: plain maths, no audio.
 *
 * A few bars of clicks before bar 1, like a bandleader's "one, two, three,
 * four". When the melody has a pickup, the clicks stop where it starts, so
 * the singer hears exactly where to come in and the clicks don't talk over
 * them. With the metronome on, they carry on into bar 1 instead, where the
 * metronome takes over.
 */

/** The count-in lengths offered in the record panel (bars). */
export const COUNT_IN_BARS = [1, 2];

/**
 * @param {{ bars: number, bar: { seconds: number, quarters: number }, pickup: number, clickThrough: boolean }} options
 *   bars: how many bars of clicks; bar: bar 1's length (seconds) and beats;
 *   pickup: the melody's pickup before bar 1 (seconds); clickThrough: the
 *   metronome is on, so click every beat
 * @returns {{ seconds: number, beats: number }} how long before bar 1 it starts, and how many clicks
 */
export function countIn({ bars, bar, pickup, clickThrough }) {
	const seconds = bars * bar.seconds;
	const allBeats = bars * bar.quarters;
	if (clickThrough || pickup <= 0) return { seconds, beats: allBeats };
	const beatSeconds = bar.seconds / bar.quarters;
	// Every beat that falls before the pickup's first note
	const beforePickup = Math.ceil((seconds - pickup) / beatSeconds - 1e-6);
	return { seconds, beats: Math.min(allBeats, Math.max(0, beforePickup)) };
}
