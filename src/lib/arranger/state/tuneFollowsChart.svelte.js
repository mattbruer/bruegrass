/**
 * Keep a tune kept by section with the chart as it's edited: a section
 * renamed in the chart keeps its tune (melody/sections/renamedParts.js).
 * Cutting, copying and reordering need nothing here: the tune is made from
 * the chart's sections each time. Call once from the arranger's layout,
 * which owns the effect.
 */
import { untrack } from 'svelte';
import { sectionInstances } from '../melody/sections/tuneBySection.js';
import { renamedParts } from '../melody/sections/renamedParts.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepTuneWithChart(arranger) {
	let before = sectionInstances(untrack(() => arranger.arrangement.text));
	$effect(() => {
		const after = sectionInstances(arranger.arrangement.text);
		const tune = untrack(() => arranger.melody.bySection);
		const parts = tune && renamedParts(before, after, tune.parts);
		before = after;
		if (tune && parts) arranger.melody.bySection = { ...tune, parts };
	});
}
