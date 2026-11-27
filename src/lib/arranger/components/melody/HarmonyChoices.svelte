<script>
	/**
	 * Harmony lines generated from one lane (the lead: the melody, or a part
	 * you wrote): a layout in one tap (2 parts, 3 parts, lead on top:
	 * HARMONY_LAYOUTS), or each line on its own, each a lane of its own that
	 * follows the lead and the chords; the others stay as they are. Rewrite
	 * writes every line again from the lead as it is now. The host places it
	 * (a lane's ⋯ menu, the Melody tab).
	 */
	import { useArranger } from '../../state/context.js';
	import { HARMONY_LAYOUTS, HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ lead: string, heading?: string }}
	 *   lead: the lane the lines are written from; heading: shown above the choices
	 */
	let { lead, heading = 'Harmony lines' } = $props();

	const { arrangement, melody, parts } = useArranger();

	const lines = $derived(parts.harmonyOf(lead));
	const problem = $derived(parts.harmonyProblem.lead === lead ? parts.harmonyProblem.problem : '');

	/** @param {readonly string[]} layout */
	function isLayout(layout) {
		return lines.length === layout.length && layout.every((id) => lines.includes(id));
	}

	/** One tap: these lines exactly; tapped again, none. @param {readonly string[]} layout */
	function useLayout(layout) {
		parts.harmonise(lead, isLayout(layout) ? [] : [...layout]);
	}

	/** @param {string} id */
	function toggle(id) {
		parts.harmonise(
			lead,
			lines.includes(id) ? lines.filter((each) => each !== id) : [...lines, id]
		);
	}
</script>

{#if melody.tune && arrangement.isPlayable}
	<div class="flex flex-col gap-2 text-sm">
		<span class="heading">{heading}</span>
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="{heading}: layouts">
			{#each HARMONY_LAYOUTS as layout (layout.id)}
				<button
					type="button"
					class="ui-button px-2.5 py-1"
					class:ui-button-on={isLayout(layout.parts)}
					aria-pressed={isLayout(layout.parts)}
					onclick={() => useLayout(layout.parts)}
					use:tooltip={TIPS.melody.harmony.layouts[layout.id]}>{layout.name}</button
				>
			{/each}
		</div>
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="{heading}: line by line">
			{#each HARMONY_PARTS as part (part.id)}
				<button
					type="button"
					class="ui-button px-2.5 py-1"
					class:ui-button-on={lines.includes(part.id)}
					aria-pressed={lines.includes(part.id)}
					onclick={() => toggle(part.id)}
					use:tooltip={TIPS.melody.harmony[part.id]}>{part.name}</button
				>
			{/each}
		</div>
		{#if lines.length > 0}
			<button
				type="button"
				class="self-start ui-button px-2.5 py-1"
				onclick={() => parts.harmonise(lead, lines, { fresh: true })}
				use:tooltip={TIPS.melody.harmony.rewrite}>Rewrite the lines</button
			>
		{/if}
		{#if problem}
			<p class="text-accent">{problem}</p>
		{/if}
	</div>
{/if}

<style>
	.heading {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
