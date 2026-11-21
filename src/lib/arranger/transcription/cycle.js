import { SECTION_END } from './readChartOnBars.js';

/**
 * The cycle, Logic's way: a stretch of the song that plays over and over,
 * from bar line to bar line. Times are quarters from bar 1.
 *
 * @typedef {{ from: number, to: number }} Cycle
 */

/**
 * Where bars start, plus where the last one ends. A tune's pickup (quarters
 * before bar 1) is a line too, so a cycle can start in it.
 * @param {import('../tracks/ruler.js').RulerBar[]} ruler
 * @param {number} pickup quarters the tune starts before bar 1 (0: none)
 * @returns {number[]}
 */
export function barLines(ruler, pickup = 0) {
	const bars = ruler.filter((bar) => bar.number > 0);
	const last = bars.at(-1);
	if (!last) return [];
	const pickupStart = pickup > 0 ? [-pickup] : [];
	return [...pickupStart, ...bars.map((bar) => bar.start), last.start + last.beats];
}

/** The grid the cycle's ends snap to when Snap is on: a sixteenth note (a quarter is one beat). */
export const CYCLE_SNAP_QUARTERS = 0.25;

/**
 * A place in the song, snapped to the grid if asked and kept inside the song.
 * @param {number} quarters
 * @param {number[]} lines
 * @param {boolean} snap
 */
function placeInCycle(quarters, lines, snap) {
	const onGrid = snap ? Math.round(quarters / CYCLE_SNAP_QUARTERS) * CYCLE_SNAP_QUARTERS : quarters;
	return Math.min(lines.at(-1) ?? 0, Math.max(lines[0] ?? 0, onGrid));
}

/**
 * The cycle between two places, in either order. Null when they're the same
 * place (too short to make a cycle).
 * @param {number} a
 * @param {number} b
 * @param {number[]} lines
 * @param {boolean} snap
 * @returns {Cycle | null}
 */
export function cycleFromTo(a, b, lines, snap) {
	if (lines.length < 2) return null;
	const from = placeInCycle(Math.min(a, b), lines, snap);
	const to = placeInCycle(Math.max(a, b), lines, snap);
	return to > from ? { from, to } : null;
}

/**
 * The bar a place is in, as a cycle.
 * @param {number} quarters
 * @param {number[]} lines
 * @returns {Cycle | null}
 */
export function barAround(quarters, lines) {
	const index = lines.findLastIndex((line, i) => line <= quarters && i < lines.length - 1);
	const at = Math.max(0, index);
	return lines.length < 2 ? null : { from: lines[at], to: lines[at + 1] };
}

/**
 * The cycle slid along the song by some quarters, keeping its length and
 * staying inside the song.
 * @param {Cycle} cycle
 * @param {number} delta
 * @param {number[]} lines
 * @param {boolean} snap
 * @returns {Cycle}
 */
export function movedCycle(cycle, delta, lines, snap) {
	const length = cycle.to - cycle.from;
	const latestStart = (lines.at(-1) ?? 0) - length;
	const from = Math.min(latestStart, placeInCycle(cycle.from + delta, lines, snap));
	return { from, to: from + length };
}

/**
 * What a press on the strip grabs of the cycle: its start, its end, its
 * body, or nothing (a new cycle starts there).
 * @param {number} x pixels along the strip
 * @param {{ left: number, right: number } | null} edges the cycle's ends, in pixels
 * @param {number} grip pixels either side of an end that still grab it
 * @returns {'from' | 'to' | 'body' | null}
 */
export function grabbedPart(x, edges, grip) {
	if (!edges) return null;
	const reach = Math.min(grip, (edges.right - edges.left) / 3);
	if (Math.abs(x - edges.left) <= reach) return 'from';
	if (Math.abs(x - edges.right) <= reach) return 'to';
	return x > edges.left && x < edges.right ? 'body' : null;
}

/**
 * The named sections as cycles: each runs from its marker's bar to the next
 * marker (an End marker, or another name), or to the song's end. End
 * markers themselves aren't sections.
 * @param {Record<number, string>} markers bar number → name (SECTION_END ends one)
 * @param {{ number: number, firstBeat: number, beats: number }[]} bars
 * @param {number} origin the beat that is quarter 0 (the grid's first bar)
 * @returns {{ number: number, name: string, region: Cycle }[]}
 */
export function sectionCycles(markers, bars, origin) {
	const last = bars.at(-1);
	if (!last) return [];
	const starts = bars.filter((bar) => markers[bar.number]);
	return starts
		.map((bar, i) => {
			const stop = starts[i + 1]?.firstBeat ?? last.firstBeat + last.beats;
			return {
				number: bar.number,
				name: markers[bar.number],
				region: { from: bar.firstBeat - origin, to: stop - origin }
			};
		})
		.filter((section) => section.name !== SECTION_END);
}
