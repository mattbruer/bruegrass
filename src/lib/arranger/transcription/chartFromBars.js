/**
 * The song's chart, written from a transcription: one bar for each bar of
 * the recording, with the chords written so far (barChords.js). An odd bar
 * gets its own time signature for that bar only, in quarters (`[5/4]`); a
 * song not in 4/4 gets its time at the start (`[M:3/4]`, `[M:2/2]`).
 *
 * A bar with no chord written is "N.C." (no chord): nothing is assumed, so
 * the song has no key until a chord is written, and the band rests there.
 * A bar whose first beat is empty but has a chord later carries on the
 * chord before it until then.
 */
import { NO_CHORD } from '../chart/noChord.js';
import { chartCell, isEmptyBar, slotsOf } from './barChords.js';

/** The song's one section, until sections are marked. */
const SECTION_NAME = 'Song';

/**
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {{ id: string, beatsPerBar: number }} time from timeSignatures.js
 * @param {Record<number, import('./barChords.js').Slots | string>} chords bar number → its slots
 * @returns {string}
 */
export function chartFromBars(bars, time, chords) {
	let carried = NO_CHORD;
	const cells = bars.map((bar) => {
		const slots = slotsOf(chords[bar.number], bar.beats);
		const meter = bar.beats === time.beatsPerBar ? '' : `[${bar.beats}/4]`;
		if (isEmptyBar(slots)) {
			carried = NO_CHORD;
			return `${meter}${NO_CHORD}`;
		}
		const cell = chartCell(slots, carried);
		carried = cell.split(',').at(-1) ?? NO_CHORD;
		return `${meter}${cell}`;
	});
	const songMeter = time.id === '4/4' ? '' : `[M:${time.id}]`;
	return `"${SECTION_NAME}"${songMeter}|${cells.join('|')}|`;
}
