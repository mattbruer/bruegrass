/**
 * The count-in before every recorded take: plain maths, no audio.
 *
 * A few bars of clicks before the song starts (playback/songStart.js: the
 * pickup bar when there is one), like a bandleader's "one, two, three, four".
 */

/** The count-in lengths offered (bars). */
export const COUNT_IN_BARS = [1, 2];

/**
 * @param {{ bars: number, bar: { seconds: number, quarters: number } }} options
 *   bars: how many bars of clicks; bar: bar 1's length (seconds) and beats
 * @returns {{ seconds: number, beats: number }} how long before bar 1 it starts, and how many clicks
 */
export function countInClicks({ bars, bar }) {
	return { seconds: bars * bar.seconds, beats: bars * bar.quarters };
}
