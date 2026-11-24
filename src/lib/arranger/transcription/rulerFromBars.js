/**
 * The track grid's bar ruler for a transcription, in the tracks view's own
 * shape (tracks/ruler.js): the recording's bars in quarters from bar 1.
 * An odd bar shows its time signature, like Logic's ruler, and a marker
 * its section's name.
 */
import { barLabel } from './barNumbers.js';

/**
 * @param {import('./barPlan.js').Bar[]} bars
 * @param {Record<number, string>} [markers] bar number → the section starting there
 * @param {boolean} [pickupBar] the first bar is a pickup (barNumbers.js)
 * @returns {import('../tracks/ruler.js').RulerBar[]}
 */
export function rulerFromBars(bars, markers = {}, pickupBar = false) {
	const first = bars[0]?.firstBeat ?? 0;
	return bars.map((bar) => ({
		number: bar.number,
		start: bar.firstBeat - first,
		beats: bar.beats,
		sectionName: markers[bar.number] ?? null,
		label: rulerLabel(bar, pickupBar)
	}));
}

/**
 * @param {import('./barPlan.js').Bar} bar
 * @param {boolean} pickupBar
 */
function rulerLabel(bar, pickupBar) {
	const name = barLabel(bar.number, pickupBar);
	return bar.odd ? `${name}  ${bar.beats}/4` : name;
}

/** Quarters of room before the first bar, so the lead-in's first beat isn't on the edge. */
const ROOM_BEFORE = 1;

/**
 * The whole grid's span, in quarters: the ruler and the recording on it
 * (which may reach before bar 1, or past the last bar while it's slid).
 * @param {import('../tracks/ruler.js').RulerBar[]} ruler
 * @param {{ from: number, to: number }} clip the trimmed recording, in quarters from bar 1
 * @param {number} beatsPerBar room after the end
 */
export function gridSpan(ruler, clip, beatsPerBar) {
	const last = ruler.at(-1);
	const rulerEnd = last ? last.start + last.beats : 0;
	return {
		start: Math.min(ruler[0]?.start ?? 0, clip.from) - ROOM_BEFORE,
		end: Math.max(rulerEnd, clip.to) + beatsPerBar
	};
}

/**
 * Markers as the ruler names them: a section whose tune starts early says so.
 * @param {Record<number, string>} markers bar number → name
 * @param {Record<number, number>} pickups bar number → beats its tune starts before the bar
 */
export function markersShown(markers, pickups) {
	return Object.fromEntries(
		Object.entries(markers).map(([bar, name]) => {
			const beats = pickups[Number(bar)];
			return [bar, beats ? `${name} (pickup ${beats})` : name];
		})
	);
}
