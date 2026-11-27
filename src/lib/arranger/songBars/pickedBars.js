/**
 * Bars of the whole song picked on the ruler (by number, as the ruler
 * shows them), found in the chart as written: which section and which of
 * its bars, and when they play. Only bars the band plays once can be taken
 * out or added to: a section played again `as` another shares its bars, so
 * a cut there would land twice.
 *
 * @typedef {{ section: number, name: string, bars: number[] }} SectionBars
 *   section: its index in the chart; bars: its own bars picked (indices), in order
 * @typedef {{ sections: SectionBars[], from: number, to: number }} PickedBars
 *   from, to: quarters from bar 1
 */

/**
 * @param {import('../tracks/ruler.js').RulerBar[]} ruler
 * @param {import('../chart/writtenChart.js').WrittenChart} chart
 * @param {number} first bar number
 * @param {number} last
 * @returns {{ picked: PickedBars | null, problem: string }}
 */
export function pickedBars(ruler, chart, first, last) {
	const bars = ruler.filter((bar) => bar.number >= first && bar.number <= last);
	if (bars.length === 0) return refused('Pick some bars with the cycle first.');
	if (bars.some((bar) => bar.number === 0)) return refused('The pickup can’t be taken out here.');
	/** @type {SectionBars[]} */
	const sections = [];
	for (const bar of bars) {
		const place = /** @type {{ section: number, bar: number }} */ (bar.place);
		const written = chart.sections[place.section];
		if (!written) return refused('The chart can’t be read that way.');
		const problem = sharedProblem(chart, written);
		if (problem) return refused(problem);
		const last = sections.at(-1);
		if (last?.section === place.section) last.bars.push(place.bar);
		else sections.push({ section: place.section, name: written.name, bars: [place.bar] });
	}
	const end = bars[bars.length - 1];
	return { picked: { sections, from: bars[0].start, to: end.start + end.beats }, problem: '' };
}

/**
 * Why a section's bars can't change here ('' when they can).
 * @param {import('../chart/writtenChart.js').WrittenChart} chart
 * @param {import('../chart/writtenChart.js').WrittenSection} section
 */
function sharedProblem(chart, section) {
	if (section.repeats)
		return `“${section.name}” plays “${section.repeats}” again: change those bars in “${section.repeats}”.`;
	const again = chart.sections.find((other) => other.repeats === section.name);
	if (again)
		return `“${section.name}” is played again as “${again.name}”, so these bars would change twice: do it in the chart.`;
	return '';
}

/** @param {string} problem */
function refused(problem) {
	return { picked: null, problem };
}
