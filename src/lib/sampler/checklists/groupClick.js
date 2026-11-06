/**
 * The click a group is recorded to, if it has one: a count-in, then the
 * bars to play. Playing in motion to a click (the real strum, at a real
 * tempo) sounds like playing, and tells the slicer where to expect hits.
 * A layer's own tempo overrides the group's (grazes at two tempos).
 */

/**
 * @param {import('./guitar.js').Checklist} checklist
 * @param {import('./targets.js').Target} target
 * @returns {import('$lib/recording/clickTrack.js').ClickRun | null}
 */
export function clickRun(checklist, target) {
	const click = findGroup(checklist, target)?.click;
	if (!click) return null;
	return {
		tempo: target.tempo ?? click.tempo,
		beatsPerBar: click.beatsPerBar,
		bars: click.countInBars + click.bars
	};
}

/**
 * The click in words: "Click at 100 BPM: 1 bar to count you in, then play
 * 8 bars." For the whole group (the list) every tempo is named.
 * @param {import('./guitar.js').TargetGroup | undefined} group
 * @param {number | null} [tempo] the target's own tempo
 */
export function describeClick(group, tempo = null) {
	const click = group?.click;
	if (!group || !click) return null;
	const tempos = tempo
		? [tempo]
		: [...new Set(group.layers.map((layer) => layer.tempo ?? click.tempo))];
	const countIn = `${click.countInBars} bar${click.countInBars === 1 ? '' : 's'}`;
	return `Click at ${tempos.join(' and ')} BPM: ${countIn} to count you in, then play ${click.bars} bars. Wear headphones, so the mic doesn’t hear it.`;
}

/**
 * @param {import('./guitar.js').Checklist} checklist
 * @param {import('./targets.js').Target} target
 */
function findGroup(checklist, target) {
	return checklist.groups.find((group) => group.id === target.groupId);
}
