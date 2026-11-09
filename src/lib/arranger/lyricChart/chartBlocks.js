/**
 * The chart as blocks to lay out on paper, in order: the header, then
 * every row. A section's name travels with its first row, so a page
 * never ends on a section name.
 *
 * @typedef {{ kind: 'header' }
 *   | { kind: 'row', bars: import('./chartRows.js').RowBar[], sectionName: string | null, pickup: string }} ChartBlock
 *   sectionName and pickup: only on a section's first row
 */

/**
 * @param {import('./chartRows.js').ChartSection[]} sections
 * @returns {ChartBlock[]}
 */
export function chartBlocks(sections) {
	/** @type {ChartBlock[]} */
	const blocks = [{ kind: 'header' }];
	for (const section of sections) {
		section.rows.forEach((bars, r) => {
			const first = r === 0;
			blocks.push({
				kind: 'row',
				bars,
				sectionName: first ? section.name : null,
				pickup: first ? section.pickup : ''
			});
		});
	}
	return blocks;
}
