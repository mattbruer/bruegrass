/**
 * Keep a tune kept by section with the chart as it's edited: a section
 * renamed in the chart keeps its tune and bass line (melody/sections/renamedParts.js),
 * and bars added to or removed from a section are added to or removed from
 * its tune (melody/sections/barsFollowChart.js). Cutting, copying and
 * reordering need nothing here: the tune is made from the chart's sections
 * each time. Call once from the arranger's layout,
 * which owns the effect.
 */
import { untrack } from 'svelte';
import { sectionInstances } from '../melody/sections/tuneBySection.js';
import { sectionBarKeys } from '../melody/sections/barsFollowChart.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepTuneWithChart(arranger) {
	let before = sectionInstances(untrack(() => arranger.arrangement.text));
	let barsBefore = untrack(() => barKeys(arranger));
	let song = untrack(() => arranger.songsLoaded);
	$effect(() => {
		const after = sectionInstances(arranger.arrangement.text);
		const barsAfter = barKeys(arranger);
		const sameSong = arranger.songsLoaded === song;
		song = arranger.songsLoaded;
		untrack(() => {
			if (sameSong) arranger.followRenames(before);
			if (barsAfter) {
				if (barsBefore && sameSong) arranger.followBars(barsBefore);
				barsBefore = barsAfter;
			}
		});
		before = after;
	});
}

/**
 * Each section's bars as the chart is now (null while it can't be read).
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 */
function barKeys(arranger) {
	const { arrangement } = arranger;
	if (arrangement.readError) return null;
	return sectionBarKeys(arrangement.sections, sectionInstances(arrangement.text));
}
