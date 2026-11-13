/**
 * The track grid's bar ruler for a transcription, in the tracks view's own
 * shape (tracks/ruler.js): the recording's bars in quarters from bar 1,
 * after its lead-in (the beats before bar 1). An odd bar shows its time
 * signature, like Logic's ruler, and a marker its section's name.
 */

/**
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {number} beatsPerBar
 * @param {number} leadInBeats beats before bar 1
 * @param {Record<number, string>} [markers] bar number → the section starting there
 * @returns {import('../tracks/ruler.js').RulerBar[]}
 */
export function rulerFromBars(bars, beatsPerBar, leadInBeats, markers = {}) {
	const first = bars[0]?.firstBeat ?? 0;
	const lead =
		leadInBeats > 0
			? [
					{
						number: 0,
						start: -leadInBeats,
						beats: leadInBeats,
						sectionName: null,
						label: 'Lead-in'
					}
				]
			: [];
	return [
		...lead,
		...bars.map((bar) => ({
			number: bar.number,
			start: bar.firstBeat - first,
			beats: bar.beats,
			sectionName: markers[bar.number] ?? null,
			label: bar.odd ? `${bar.number}  ${bar.beats}/4` : String(bar.number)
		}))
	];
}

/**
 * The whole ruler's span, in quarters.
 * @param {import('../tracks/ruler.js').RulerBar[]} ruler
 * @param {number} beatsPerBar room after the last bar
 */
export function rulerSpanWithRoom(ruler, beatsPerBar) {
	const last = ruler.at(-1);
	return {
		start: ruler[0]?.start ?? 0,
		end: last ? last.start + last.beats + beatsPerBar : beatsPerBar
	};
}
