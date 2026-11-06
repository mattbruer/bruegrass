<script>
	/**
	 * A fair A/B test of the output stage: Compare turns it on, then A plays
	 * through the output stage and B plays the original mix, both at the same
	 * loudness. (Louder always sounds better, so only a level-matched test
	 * tells you whether the limiter changes the sound itself.)
	 */
	import { outputComparison } from '../../../playback/output/outputStage.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<div class="flex w-full flex-col gap-1.5 text-xs">
	<button
		type="button"
		class="ui-button px-2 py-1"
		class:ui-button-on={outputComparison.comparing}
		aria-pressed={outputComparison.comparing}
		use:tooltip={TIPS.loudness.compare}
		onclick={() => (outputComparison.comparing = !outputComparison.comparing)}
	>
		Compare
	</button>
	{#if outputComparison.comparing}
		<div class="flex gap-1.5" role="group" aria-label="Hear">
			<button
				type="button"
				class="flex-1 ui-button py-1"
				class:ui-button-on={!outputComparison.hearOriginal}
				aria-pressed={!outputComparison.hearOriginal}
				use:tooltip={TIPS.loudness.hearA}
				onclick={() => (outputComparison.hearOriginal = false)}
			>
				A
			</button>
			<button
				type="button"
				class="flex-1 ui-button py-1"
				class:ui-button-on={outputComparison.hearOriginal}
				aria-pressed={outputComparison.hearOriginal}
				use:tooltip={TIPS.loudness.hearB}
				onclick={() => (outputComparison.hearOriginal = true)}
			>
				B
			</button>
		</div>
	{/if}
</div>
