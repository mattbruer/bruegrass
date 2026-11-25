/**
 * How the video tiles are laid out: so many across, as many rows down as
 * that takes. Four tiles can be 1 across (one column of four), 2 across
 * (two by two) or 4 across (one row).
 */

/**
 * Every way to lay out `count` tiles, by how many across. A column that
 * doesn't save a row is left out (four tiles 3 across is still two rows).
 * @param {number} count
 * @returns {{ columns: number, rows: number }[]}
 */
export function layoutChoices(count) {
	/** @param {number} columns */
	const rowsFor = (columns) => Math.ceil(count / columns);
	return Array.from({ length: count }, (_, index) => index + 1)
		.filter((columns) => columns === 1 || rowsFor(columns) < rowsFor(columns - 1))
		.map((columns) => ({ columns, rows: rowsFor(columns) }));
}

/**
 * How many across: the one chosen, or the squarest grid while none is (or it no longer fits).
 * @param {number} count
 * @param {number} chosen 0: none chosen
 */
export function columnsFor(count, chosen) {
	if (chosen >= 1 && chosen <= count) return chosen;
	return Math.max(1, Math.ceil(Math.sqrt(count)));
}
