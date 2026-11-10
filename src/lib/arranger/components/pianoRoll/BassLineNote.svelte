<script>
	/**
	 * Under the roll while the bass is being edited: what happens to your
	 * changes, and a way back to the band's own line.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { bass } = useArranger();
</script>

<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
	<p>
		{#if bass.isWritten}
			Your bass line. When the chart's chords change, only the bars they change get a fresh bass
			line.
		{:else}
			The band's own bass line, written from the chart. Change any note to make it yours.
		{/if}
	</p>
	{#if bass.isWritten}
		<button
			type="button"
			class="ui-button px-3 py-1.5"
			onclick={() => bass.rewriteFromChart()}
			use:tooltip={TIPS.melody.bassFromChart}>Rewrite from the chart</button
		>
	{/if}
</div>
