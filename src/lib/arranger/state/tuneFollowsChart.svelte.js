/**
 * Keep a tune kept by section with the chart as it's edited: a section
 * renamed in the chart keeps its tune and bass line (melody/sections/renamedParts.js).
 * Cutting, copying and reordering need nothing here: the tune is made from
 * the chart's sections each time. Call once from the arranger's layout,
 * which owns the effect.
 */
import { untrack } from 'svelte';
import { sectionInstances } from '../melody/sections/tuneBySection.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepTuneWithChart(arranger) {
	let before = sectionInstances(untrack(() => arranger.arrangement.text));
	$effect(() => {
		const after = sectionInstances(arranger.arrangement.text);
		untrack(() => arranger.followRenames(before));
		before = after;
	});
}
