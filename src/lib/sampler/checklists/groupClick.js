/**
 * The click a group is recorded to, if it has one: a count-in, then the
 * bars to play (e.g. the real boom-chuck strums, recorded at the tempo the
 * sampler's loop will play, so the two can be A/B'd in time).
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
		tempo: click.tempo,
		beatsPerBar: click.beatsPerBar,
		bars: click.countInBars + click.bars
	};
}

/**
 * The click in words, for the prompt: "Click at 100 BPM: 1 bar to count
 * you in, then play 8 bars."
 * @param {import('./guitar.js').TargetGroup | undefined} group
 */
export function describeClick(group) {
	const click = group?.click;
	if (!click) return null;
	const countIn = `${click.countInBars} bar${click.countInBars === 1 ? '' : 's'}`;
	return `Click at ${click.tempo} BPM: ${countIn} to count you in, then play ${click.bars} bars.`;
}

/**
 * @param {import('./guitar.js').Checklist} checklist
 * @param {import('./targets.js').Target} target
 */
function findGroup(checklist, target) {
	return checklist.groups.find((group) => group.id === target.groupId);
}
