/**
 * A checklist spelled out as targets: one per recording to make, in the
 * order the session asks for them ("D string, fret 5, hard, take 2 of 3").
 *
 * Order: one group at a time, one string at a time (long runs without
 * retuning or moving the mic), each layer's frets low to high, every take
 * of a note before the next note.
 *
 * A target's id is built from what it is, never from its position, so
 * takes stay matched to their target when a checklist gains frets or takes.
 */
import { GUITAR } from './guitar.js';

/** Every instrument there's a checklist for (one line per new instrument). */
export const CHECKLISTS = [GUITAR];

/** @param {string} id */
export function findChecklist(id) {
	return CHECKLISTS.find((checklist) => checklist.id === id) ?? null;
}

/**
 * @typedef {{
 *   id: string,
 *   groupId: string,
 *   stringId: string | null,
 *   fret: number | null,
 *   midi: number | null,
 *   direction: string | null,
 *   intensity: string,
 *   take: number,
 *   takes: number,
 *   row: string,
 *   column: string
 * }} Target
 *   take: 1-based, of `takes` in its layer. row/column: where it sits in the
 *   progress grid (string × fret, or direction × intensity).
 */

/**
 * @param {import('./guitar.js').Checklist} checklist
 * @returns {Target[]}
 */
export function listTargets(checklist) {
	/** @type {Target[]} */
	const targets = [];
	for (const group of checklist.groups) {
		if (group.pitched) {
			for (const stringId of group.strings ?? []) {
				const string = checklist.strings.find((each) => each.id === stringId);
				if (!string) continue;
				for (const layer of group.layers) {
					for (const fret of group.frets ?? []) {
						for (let take = 1; take <= layer.takes; take++) {
							targets.push({
								id: `${group.id}:${stringId}:f${fret}:${layer.intensity}:t${take}`,
								groupId: group.id,
								stringId,
								fret,
								midi: string.midi + fret,
								direction: null,
								intensity: layer.intensity,
								take,
								takes: layer.takes,
								row: string.name,
								column: fret === 0 ? 'Open' : `Fret ${fret}`
							});
						}
					}
				}
			}
		} else {
			for (const direction of group.directions ?? []) {
				for (const layer of group.layers) {
					for (let take = 1; take <= layer.takes; take++) {
						targets.push({
							id: `${group.id}:${direction}:${layer.intensity}:t${take}`,
							groupId: group.id,
							stringId: null,
							fret: null,
							midi: null,
							direction,
							intensity: layer.intensity,
							take,
							takes: layer.takes,
							row: capitalise(direction),
							column: capitalise(layer.intensity)
						});
					}
				}
			}
		}
	}
	return targets;
}

/**
 * Takes of the same thing (same note or strum, same intensity): the ones a
 * take is compared with for loudness and brightness.
 * @param {Target} a
 * @param {Target} b
 */
export function isSameLayer(a, b) {
	return (
		a.groupId === b.groupId &&
		a.stringId === b.stringId &&
		a.fret === b.fret &&
		a.direction === b.direction &&
		a.intensity === b.intensity
	);
}

/**
 * A group's targets laid out as a grid of cells, for the progress view.
 * @param {Target[]} targets
 * @param {string} groupId
 * @returns {{ columns: string[], rows: { label: string, cells: { column: string, targets: Target[] }[] }[] }}
 */
export function targetGrid(targets, groupId) {
	const inGroup = targets.filter((target) => target.groupId === groupId);
	const columns = [...new Set(inGroup.map((target) => target.column))];
	const rowLabels = [...new Set(inGroup.map((target) => target.row))];
	return {
		columns,
		rows: rowLabels.map((label) => ({
			label,
			cells: columns.map((column) => ({
				column,
				targets: inGroup.filter((target) => target.row === label && target.column === column)
			}))
		}))
	};
}

/** @param {string} text */
function capitalise(text) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
