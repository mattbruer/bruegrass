/**
 * Loop regions: practise just part of the arrangement.
 *
 * A region is cut out of the arrangement as a smaller arrangement (whole
 * bars, with their sections and time signatures), so every instrument,
 * the chart and the scheduler play it exactly as they play a whole song.
 */

import { DEFAULT_METER, barQuarters } from './timeline.js';

/**
 * @typedef {import('./timeline.js').Section & { barOffset?: number, source?: number }} LoopSection
 *   barOffset: index of the section's first bar in the original section,
 *   so bar numbers can still be shown as in the full arrangement;
 *   source: the original section's index (to find its words)
 * @typedef {{ section: number, from: number, to: number }} LoopChoice
 *   section: index, or -1 for the whole arrangement; from/to: 1-based bars
 *   within that scope, inclusive
 */

/**
 * The bars a loop choice can pick from, in play order.
 * @param {import('./timeline.js').Section[]} sections
 * @param {number} section index, or -1 for every section
 */
export function loopScope(sections, section) {
	return sections.flatMap((item, s) =>
		section === -1 || section === s ? item.measures.map((_, m) => ({ section: s, measure: m })) : []
	);
}

/**
 * Cut a loop region out of the arrangement.
 * @param {import('./timeline.js').Section[]} sections
 * @param {LoopChoice} choice from/to are clamped into range
 * @returns {LoopSection[]}
 */
export function loopRegion(sections, { section, from, to }) {
	const scope = loopScope(sections, section);
	if (scope.length === 0) return [];
	const first = clamp(Math.round(from) || 1, 1, scope.length);
	const last = clamp(Math.round(to) || scope.length, first, scope.length);

	/** @type {LoopSection[]} */
	const region = [];
	let lastSource = -1;
	for (const { section: s, measure: m } of scope.slice(first - 1, last)) {
		const source = sections[s];
		if (s !== lastSource) {
			region.push({ name: source.name, measures: [], meters: [], barOffset: m, source: s });
			lastSource = s;
		}
		const current = /** @type {LoopSection} */ (region.at(-1));
		current.measures.push(source.measures[m]);
		current.meters?.push(source.meters?.[m] ?? DEFAULT_METER);
	}
	return region;
}

/**
 * Where a loop region starts in the full arrangement, in quarter notes, so
 * parts written against the whole song (the melody) can play the same bars.
 * @param {import('./timeline.js').Section[]} sections
 * @param {LoopChoice} choice
 */
export function loopOffset(sections, { section, from }) {
	const scope = loopScope(sections, section);
	if (scope.length === 0) return 0;
	const first = scope[clamp(Math.round(from) || 1, 1, scope.length) - 1];
	let quarters = 0;
	for (const [s, item] of sections.entries()) {
		for (const [m, measure] of item.measures.entries()) {
			if (s === first.section && m === first.measure) return quarters;
			if (measure.some(Boolean)) quarters += barQuarters(item.meters?.[m] ?? DEFAULT_METER);
		}
	}
	return quarters;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
