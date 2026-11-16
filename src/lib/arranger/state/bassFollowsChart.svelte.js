/**
 * Keep an edited bass line in step with the chart: whenever the chart's
 * chords (or the capo, or the key) change, the bars they changed are written
 * fresh and the rest keep their hand edits (bass/bassFollowsChart.js). A
 * line written by ear from nothing (bass/bassAbc.js `isAsPlayed`) isn't moved.
 * Call once from the arranger's layout, which owns the effect.
 */
import { untrack } from 'svelte';
import { bassFollowingChart } from '../bass/bassFollowsChart.js';
import { generatedBassAbc, isAsPlayed } from '../bass/bassAbc.js';
import { readBassScore } from '../bass/readBass.js';
import { bassSongOf } from '../bass/songBassStyle.svelte.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';

/** @param {import('./Arranger.svelte.js').Arranger} arranger */
export function keepBassWithChart(arranger) {
	$effect(() => {
		// Only the chart moves an edited line; the tune just shapes the bars it rewrites
		const song = bassSongOf(
			arranger,
			untrack(() => arranger.melody.line)
		);
		void arranger.melodyKey;
		const abcjs = abcjsIfLoaded();
		if (!arranger.arrangement.isPlayable) return;
		// Kept by section, it follows the chart by itself
		if (untrack(() => arranger.bass.bySection)) return;
		const written = untrack(() => arranger.bass.notation);
		const old = untrack(() => arranger.bass.read);
		// A line written by ear (as played) is left as written
		if (!old || isAsPlayed(written)) return;

		const fresh = generatedBassAbc(song);
		const neu = readBassScore(fresh, abcjs);
		if (!neu) return;
		const followed = bassFollowingChart(written, old.score, fresh, neu.score);
		if (followed !== written) arranger.bass.notation = followed;
	});
}
