<script>
	/**
	 * Harmony parts for the melody: each toggle adds or takes out one part,
	 * written into the ABC as its own voice; the other parts stay as they
	 * are. Rewrite writes every part fresh from the melody (replacing any
	 * edits made to them by hand).
	 */
	import { useArranger } from '../../state/context.js';
	import { HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();
	const { arrangement, melody } = arranger;

	/** @param {string} id */
	function toggle(id) {
		const parts = arranger.harmonyParts;
		arranger.writeHarmonies(
			parts.includes(id) ? parts.filter((part) => part !== id) : [...parts, id]
		);
	}
</script>

{#if melody.drawn.tune && arrangement.isPlayable}
	<div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
		<span class="text-ink-soft">Harmony:</span>
		{#each HARMONY_PARTS as part (part.id)}
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={arranger.harmonyParts.includes(part.id)}
				aria-pressed={arranger.harmonyParts.includes(part.id)}
				onclick={() => toggle(part.id)}
				use:tooltip={TIPS.melody.harmony[part.id]}
			>
				{part.name}
			</button>
		{/each}
		{#if arranger.harmonyParts.length > 0}
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => arranger.writeHarmonies(arranger.harmonyParts, { fresh: true })}
				use:tooltip={TIPS.melody.harmony.rewrite}
			>
				Rewrite from the melody
			</button>
		{/if}
	</div>
	{#if arranger.harmonyProblem}
		<p class="mt-2 text-sm text-accent">{arranger.harmonyProblem}</p>
	{/if}
{/if}
