<script>
	/**
	 * Harmony lines from the given melody: a layout in one tap (2 parts, 3
	 * parts, melody on top: HARMONY_LAYOUTS), or each line on its own, written
	 * into the ABC as its own voice; the other lines stay as they are.
	 * Rewrite writes every line fresh from the melody (replacing any edits
	 * made to them by hand).
	 */
	import { useArranger } from '../../state/context.js';
	import { HARMONY_LAYOUTS, HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();
	const { arrangement, melody } = arranger;

	/** @param {readonly string[]} parts */
	function isLayout(parts) {
		const now = arranger.harmonyParts;
		return now.length === parts.length && parts.every((id) => now.includes(id));
	}

	/** One tap: these lines exactly; tapped again, none. @param {readonly string[]} parts */
	function useLayout(parts) {
		arranger.writeHarmonies(isLayout(parts) ? [] : [...parts]);
	}

	/** @param {string} id */
	function toggle(id) {
		const parts = arranger.harmonyParts;
		arranger.writeHarmonies(
			parts.includes(id) ? parts.filter((part) => part !== id) : [...parts, id]
		);
	}
</script>

{#if melody.tune && arrangement.isPlayable}
	<div class="mb-2 flex flex-wrap items-center gap-2 text-sm">
		<span class="text-ink-soft">Lines from the melody:</span>
		{#each HARMONY_LAYOUTS as layout (layout.id)}
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={isLayout(layout.parts)}
				aria-pressed={isLayout(layout.parts)}
				onclick={() => useLayout(layout.parts)}
				use:tooltip={TIPS.melody.harmony.layouts[layout.id]}
			>
				{layout.name}
			</button>
		{/each}
	</div>
	<div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
		<span class="text-ink-soft">Or line by line:</span>
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
