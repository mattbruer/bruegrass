/**
 * A chart names a chord only where it changes (`|G|G|C|` reads G, –, C), and
 * at the start of every section, so a section says where it starts. Only how
 * the chart is drawn: the chart's text keeps every chord as written.
 */

/**
 * Whether this chord of this bar is named.
 * @param {import('./chartBars.js').ChartBar[]} bars in play order
 * @param {number} index the bar's place in `bars`
 * @param {number} slot the chord's place in the bar
 */
export function namesChord(bars, index, slot) {
	const bar = bars[index];
	if (bar.held) return false;
	if (slot === 0 && (index === 0 || bar.sectionStart)) return true;
	const before = slot > 0 ? bar.chords[slot - 1] : bars[index - 1]?.chords.at(-1);
	return before?.name !== bar.chords[slot].name;
}
