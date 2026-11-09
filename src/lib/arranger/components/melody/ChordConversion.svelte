<script>
	/**
	 * Chords both ways: if the melody has chord symbols, write the arrangement
	 * from them; if it has none, write the arrangement's chords into it. Then
	 * show anything the conversion couldn't do exactly.
	 */
	import { useArranger } from '../../state/context.js';
	import { readLyrics } from '../../chart/sectionLyrics.js';
	import ConversionReport from './ConversionReport.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();
	const { arrangement, melody } = arranger;

	let hasWords = $derived(
		readLyrics(arrangement.text).some((section) => section.bars.length > 0 || section.pickup)
	);
</script>

{#if melody.drawn.sequence}
	<div class="mt-3 flex flex-wrap items-center gap-3">
		{#if melody.hasChordSymbols}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => arranger.writeArrangementFromMelodyChords()}
				use:tooltip={TIPS.melody.arrangementFromChords}
			>
				Write the arrangement from these chords
			</button>
		{:else if arrangement.isPlayable}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => arranger.writeChordsIntoMelody()}
				use:tooltip={TIPS.melody.chordsIntoMelody}
			>
				Add the arrangement's chords to the melody
			</button>
		{/if}
		{#if arrangement.isPlayable && hasWords}
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => arranger.writeWordsIntoMelody()}
				use:tooltip={TIPS.melody.wordsIntoMelody}
			>
				Add the chart's words to the melody
			</button>
		{/if}
	</div>
{/if}

<ConversionReport />
