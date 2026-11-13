/**
 * The cycle, Logic's way: a stretch of the song that plays over and over,
 * from bar line to bar line. Times are quarters from bar 1.
 *
 * @typedef {{ from: number, to: number }} Cycle
 */

/**
 * Where bars start, plus where the last one ends.
 * @param {import('../tracks/ruler.js').RulerBar[]} ruler
 * @returns {number[]}
 */
export function barLines(ruler) {
	const bars = ruler.filter((bar) => bar.number > 0);
	const last = bars.at(-1);
	return last ? [...bars.map((bar) => bar.start), last.start + last.beats] : [];
}

/**
 * A cycle dragged from one place to another, its ends snapped to the
 * nearest bar lines; never less than the bar the drag started in.
 * @param {number} start
 * @param {number} end
 * @param {number[]} lines
 * @returns {Cycle | null}
 */
export function cycleBetween(start, end, lines) {
	if (lines.length < 2) return null;
	const from = nearest(lines, Math.min(start, end));
	const to = nearest(lines, Math.max(start, end));
	return to > from ? { from, to } : barAround(start, lines);
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
 * @param {number[]} lines
 * @param {number} quarters
 */
function nearest(lines, quarters) {
	return lines.reduce((best, line) =>
		Math.abs(line - quarters) < Math.abs(best - quarters) ? line : best
	);
}
