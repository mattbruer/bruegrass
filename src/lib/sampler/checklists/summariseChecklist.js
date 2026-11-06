/**
 * A checklist counted up, for the recording list: how many takes in all,
 * and per group the sum that gets there ("6 strings × 5 frets × (3 hard +
 * 1 soft) = 120"), so the size of a session is clear at a glance.
 *
 * Counts come from `listTargets`, the same list the session walks, so the
 * summary can never disagree with what the session asks for.
 */
import { groupNotes, listTargets } from './targets.js';

/** A rough guess at one take's time: play, listen, keep. Only for the estimate. */
const SECONDS_PER_TAKE = 15;

/**
 * @param {import('./guitar.js').Checklist} checklist
 */
export function summariseChecklist(checklist) {
	const targets = listTargets(checklist);
	const groups = checklist.groups.map((group) => {
		const count = targets.filter((target) => target.groupId === group.id).length;
		return { id: group.id, name: group.name, how: group.how, count, sum: groupSum(group, count) };
	});
	return {
		total: targets.length,
		minutes: Math.round((targets.length * SECONDS_PER_TAKE) / 60),
		groups
	};
}

/**
 * @param {import('./guitar.js').TargetGroup} group
 * @param {number} count
 */
function groupSum(group, count) {
	const factors = !group.pitched
		? [plural(group.directions?.length ?? 0, 'direction')]
		: group.notes
			? [plural(groupNotes(group).length, 'note')]
			: [plural(group.strings?.length ?? 0, 'string'), plural(group.frets?.length ?? 0, 'fret')];
	const layers = group.layers.map((layer) => `${layer.takes} ${layer.intensity}`).join(' + ');
	const takes = group.layers.length > 1 ? `(${layers}) takes` : `${layers} takes`;
	return `${[...factors, takes].join(' × ')} = ${count}`;
}

/**
 * @param {number} n
 * @param {string} word
 */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
