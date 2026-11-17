/**
 * Where the bars fall on a recording's beats. The plan is plain data: the
 * beat bar 1 starts on, the usual number of beats in a bar, and the bars
 * that differ from it. Bars are laid out from it as if the song were
 * regular, so fixing one odd bar moves every bar after it with it.
 *
 * Beats are counted by index into the recording's beat list (see
 * beatGrid.js), so the plan never holds a time.
 */

/**
 * @typedef {{ firstBeat: number, beatsPerBar: number, lengths: Record<number, number> }} BarPlan
 *   firstBeat: the beat bar 1 starts on (beats before it are a pickup or an intro)
 *   lengths: bar number → its beats, only for bars that differ from beatsPerBar
 *
 * @typedef {{ number: number, firstBeat: number, beats: number, odd: boolean, complete: boolean }} Bar
 *   number: 1 for bar 1; odd: it differs from beatsPerBar; complete: false for a last bar cut off by the end
 */

/**
 * @param {number} beatsPerBar
 * @param {number} [firstBeat]
 * @returns {BarPlan}
 */
export function evenBarPlan(beatsPerBar, firstBeat = 0) {
	return { firstBeat, beatsPerBar, lengths: {} };
}

/**
 * @param {BarPlan} plan
 * @param {number} number
 */
export function barLength(plan, number) {
	return plan.lengths[number] ?? plan.beatsPerBar;
}

/**
 * Every bar that starts within the beats, in order.
 * @param {number} beatCount
 * @param {BarPlan} plan
 * @returns {Bar[]}
 */
export function layOutBars(beatCount, plan) {
	/** @type {Bar[]} */
	const bars = [];
	let firstBeat = plan.firstBeat;
	for (let number = 1; firstBeat < beatCount; number++) {
		const length = barLength(plan, number);
		const beats = Math.min(length, beatCount - firstBeat);
		bars.push({
			number,
			firstBeat,
			beats,
			odd: length !== plan.beatsPerBar,
			complete: beats === length
		});
		firstBeat += length;
	}
	return bars;
}

/**
 * The bar a beat is in, or null for a beat before bar 1.
 * @param {Bar[]} bars
 * @param {number} beat
 */
export function barAt(bars, beat) {
	return bars.find((bar) => beat >= bar.firstBeat && beat < bar.firstBeat + bar.beats) ?? null;
}

/**
 * The same plan with one bar's length changed (at least one beat).
 * @param {BarPlan} plan
 * @param {number} number
 * @param {number} beats
 * @returns {BarPlan}
 */
export function withBarLength(plan, number, beats) {
	const lengths = { ...plan.lengths };
	const length = Math.max(1, Math.round(beats));
	if (length === plan.beatsPerBar) delete lengths[number];
	else lengths[number] = length;
	return { ...plan, lengths };
}

/**
 * "ONE is here": move the bar line nearest this beat onto it, by
 * lengthening or shortening the bar before that line. Every later bar
 * moves with it. A beat nearer bar 1's line moves bar 1 (the pickup
 * changes). A beat already on a bar line changes nothing.
 * @param {BarPlan} plan
 * @param {number} beatCount
 * @param {number} beat
 * @returns {BarPlan}
 */
export function withBarStartingAt(plan, beatCount, beat) {
	const bars = layOutBars(beatCount, plan);
	const last = bars.at(-1);
	const lines = [...bars.map((bar) => bar.firstBeat), last ? last.firstBeat + last.beats : 0];
	const nearest = nearestLine(lines, beat);
	if (nearest === 0 || bars.length === 0) return { ...plan, firstBeat: beat };

	const barBefore = bars[nearest - 1];
	const length = beat - barBefore.firstBeat;
	if (length < 1) return plan;
	return withBarLength(plan, barBefore.number, length);
}

/**
 * Keep bar 1 on the same beat when a beat is added or taken away before it.
 * @param {BarPlan} plan
 * @param {number} index where the beat was inserted, or the index it was removed from
 * @param {1 | -1} change
 * @returns {BarPlan}
 */
export function withBeatCountChanged(plan, index, change) {
	const before = change === 1 ? index <= plan.firstBeat : index < plan.firstBeat;
	if (!before) return plan;
	return { ...plan, firstBeat: Math.max(0, plan.firstBeat + change) };
}

/**
 * Index of the line nearest `beat`; on a tie, the later line (a beat
 * halfway through a bar more often starts a short bar than ends a long one).
 * @param {number[]} lines
 * @param {number} beat
 */
function nearestLine(lines, beat) {
	let best = 0;
	for (let i = 1; i < lines.length; i++) {
		if (Math.abs(lines[i] - beat) <= Math.abs(lines[best] - beat)) best = i;
	}
	return best;
}
