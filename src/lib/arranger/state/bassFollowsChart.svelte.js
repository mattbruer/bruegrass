/**
 * Keep an edited bass line in step with the chart: whenever the chart's
 * chords (or the capo, or the key) change, the bars they changed are written
 * fresh and the rest keep their hand edits (bass/bassFollowsChart.js).
 * Call once from the arranger's layout, which owns the effect.
 */
import { untrack } from 'svelte';
import { bassFollowingChart } from '../bass/bassFollowsChart.js';
import { bassSongOf, generatedBassAbc } from '../bass/bassAbc.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepBassWithChart(arranger) {
	$effect(() => {
		const song = bassSongOf(arranger);
		void arranger.melodyKey;
		if (!arranger.arrangement.isPlayable) return;
		const written = untrack(() => arranger.bass.notation);
		if (!written.trim()) return;
		followChart(arranger, written, generatedBassAbc(song)).catch(console.error);
	});
}

/**
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {string} written
 * @param {string} fresh
 */
async function followChart(arranger, written, fresh) {
	const abcjs = (await import('abcjs')).default;
	const followed = bassFollowingChart(written, fresh, (abc) => abcjs.parseOnly(abc)[0]);
	// Only if nothing else changed the bass meanwhile
	if (followed !== written && arranger.bass.notation === written) arranger.bass.notation = followed;
}
