/**
 * Keep an edited bass line in step with the chart: whenever the chart's
 * chords (or the capo, or the key) change, the bars they changed are written
 * fresh and the rest keep their hand edits (bass/bassFollowsChart.js). A
 * line written by ear from nothing (bass/bassAbc.js `isAsPlayed`) isn't moved.
 * Call once from the arranger's layout, which owns the effect.
 */
import { untrack } from 'svelte';
import { bassFollowingChart } from '../bass/bassFollowsChart.js';
import { bassSongOf, generatedBassAbc, isAsPlayed } from '../bass/bassAbc.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepBassWithChart(arranger) {
	$effect(() => {
		// Only the chart moves an edited line; the tune just shapes the bars it rewrites
		const song = bassSongOf(
			arranger,
			untrack(() => arranger.melody.line)
		);
		void arranger.melodyKey;
		if (!arranger.arrangement.isPlayable) return;
		const written = untrack(() => arranger.bass.notation);
		// A line written by ear (as played) is left as written
		if (!written.trim() || isAsPlayed(written)) return;
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
