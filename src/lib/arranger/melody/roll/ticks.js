/**
 * Time on the piano roll, in whole-number ticks so triplets are exact:
 * 48 to a quarter note gives sixteenths (12), eighth triplets (16),
 * sixteenth triplets (8) and thirty-seconds (6).
 */

export const TICKS_PER_QUARTER = 48;

/** The note lengths the grid snaps to, in the order its buttons show them. */
export const GRIDS = /** @type {const} */ ([
	{ id: 'eighth', name: 'Eighths', ticks: 24 },
	{ id: 'sixteenth', name: 'Sixteenths', ticks: 12 },
	{ id: 'triplet', name: 'Triplets', ticks: 16 }
]);

/** @typedef {(typeof GRIDS)[number]['id']} GridId */

/** @param {GridId} id */
export function gridTicks(id) {
	return GRIDS.find((grid) => grid.id === id)?.ticks ?? GRIDS[0].ticks;
}

/**
 * The grid line at or before this tick.
 * @param {number} tick
 * @param {number} step grid size in ticks
 */
export function snapDown(tick, step) {
	return Math.floor(tick / step) * step;
}

/**
 * The nearest grid line.
 * @param {number} tick
 * @param {number} step
 */
export function snapNearest(tick, step) {
	return Math.round(tick / step) * step;
}

/** @param {number} wholeNotes a duration as abcjs gives it */
export function ticksOfWhole(wholeNotes) {
	return Math.round(wholeNotes * 4 * TICKS_PER_QUARTER);
}

/** @param {number} ticks */
export function quartersOf(ticks) {
	return ticks / TICKS_PER_QUARTER;
}
