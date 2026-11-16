/**
 * The song's chart, written from a transcription: one bar for each bar of
 * the recording, with the chords written so far (barChords.js). An odd bar
 * gets its own time signature for that bar only, in quarters (`[5/4]`); a
 * song not in 4/4 gets its time at the start (`[M:3/4]`, `[M:2/2]`).
 *
 * A bar with no chord written is "N.C." (no chord): nothing is assumed, so
 * the song has no key until a chord is written, and the band rests there.
 * A bar whose first beat is empty but has a chord later carries on the
 * chord before it until then; a held bar (`isHeld`) is written empty.
 *
 * Each marker starts a section with its name ("Verse", "Banjo solo"), one
 * line of the chart each; the bars before the first marker are "Song".
 * Lyric lines go under the section holding the bar they started on.
 */
import { NO_CHORD } from '../chart/noChord.js';
import { chartCell, isEmptyBar, isHeld, slotsOf } from './barChords.js';
import { UNMARKED_SECTION } from './readChartOnBars.js';

/**
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {{ id: string, beatsPerBar: number }} time from timeSignatures.js
 * @param {Record<number, import('./barChords.js').Slots | string>} chords bar number → its slots
 * @param {Record<number, string>} [markers] bar number → the name of the section starting there
 * @param {Record<number, string[]>} [lyrics] bar number → lyric lines starting there
 * @returns {string}
 */
export function chartFromBars(bars, time, chords, markers = {}, lyrics = {}) {
	let carried = NO_CHORD;
	const cells = bars.map((bar) => {
		const slots = slotsOf(chords[bar.number], bar.beats);
		const meter = bar.beats === time.beatsPerBar ? '' : `[${bar.beats}/4]`;
		if (isHeld(chords[bar.number])) return `${meter} `;
		if (isEmptyBar(slots)) {
			carried = NO_CHORD;
			return `${meter}${NO_CHORD}`;
		}
		const cell = chartCell(slots, carried);
		carried = cell.split(',').at(-1) ?? NO_CHORD;
		return `${meter}${cell}`;
	});
	const songMeter = time.id === '4/4' ? '' : `[M:${time.id}]`;
	return sectionsOf(bars, markers)
		.map(({ name, from, to }, index) => {
			const meter = index === 0 ? songMeter : '';
			const words = bars.slice(from, to).flatMap((bar) => lyrics[bar.number] ?? []);
			return [`"${name}"${meter}|${cells.slice(from, to).join('|')}|`, ...words].join('\n');
		})
		.join('\n');
}

/**
 * The bars split where markers are: each section's name and its bars (indexes).
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {Record<number, string>} markers
 */
function sectionsOf(bars, markers) {
	const starts = bars.flatMap((bar, index) => {
		const name = markers[bar.number]?.replaceAll('"', '').trim();
		return name ? [{ name, from: index }] : [];
	});
	if (starts[0]?.from !== 0) starts.unshift({ name: UNMARKED_SECTION, from: 0 });
	return starts.map((start, i) => ({ ...start, to: starts[i + 1]?.from ?? bars.length }));
}
