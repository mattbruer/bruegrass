<script>
	/** What the last conversion between the chart and the melody (chords or words) couldn't do exactly. */
	import { useArranger } from '../../state/context.js';

	const arranger = useArranger();
</script>

{#if arranger.conversionReport}
	<div class="mt-3 ui-well p-3 text-sm">
		<p class="font-semibold">{arranger.conversionReport.title}</p>
		{#if arranger.conversionReport.notes.length > 0}
			<ul class="mt-1 list-disc pl-5 text-accent">
				{#each arranger.conversionReport.notes as note, index (index)}
					<li>{note}</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
