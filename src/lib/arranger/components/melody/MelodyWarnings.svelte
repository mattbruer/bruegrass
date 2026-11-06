<script>
	/**
	 * Problems abcjs found in the melody's notation (a bar with too many
	 * beats, a typo), right under the box where you type, so you can fix
	 * them where you see them.
	 */
	import { useArranger } from '../../state/context.js';

	const { melody } = useArranger();
</script>

{#if melody.warnings.length > 0}
	<div class="mt-2 ui-well px-4 py-3 text-sm" role="status">
		<p class="font-semibold text-danger">
			{melody.warnings.length === 1 ? 'A problem' : `${melody.warnings.length} problems`} in the melody:
		</p>
		<ul class="mt-1 list-disc pl-5 text-danger">
			{#each melody.warnings as warning, index (index)}
				<li>{warning}</li>
			{/each}
		</ul>
	</div>
{/if}
