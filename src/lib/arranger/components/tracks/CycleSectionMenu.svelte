<script>
	/**
	 * The ▾ beside the Cycle button: pick one of the named sections to cycle
	 * (from its start to the next section, or End). `empty`: what to say
	 * while there are none.
	 */
	import Popover from '$lib/components/Popover.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @typedef {import('../../transcription/cycle.js').Cycle} Cycle */

	/**
	 * @type {{
	 *   cycle: {
	 *     sections: { number: number, name: string, region: Cycle }[],
	 *     set: (region: Cycle) => void,
	 *     isRegion: (region: Cycle) => boolean
	 *   },
	 *   empty?: string
	 * }}
	 */
	let { cycle, empty = 'No sections yet.' } = $props();
</script>

<Popover class="px-1 text-xs" tip={TIPS.cycle.sections}>
	{#snippet button()}<span aria-hidden="true">▾</span><span class="sr-only">Cycle a section</span
		>{/snippet}
	{#each cycle.sections as section (section.number)}
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-left text-sm"
			class:ui-button-on={cycle.isRegion(section.region)}
			onclick={() => cycle.set(section.region)}
			use:tooltip={TIPS.cycle.section}
			>{section.name} <span class="text-ink-soft tabular-nums">bar {section.number}</span></button
		>
	{:else}
		<p class="max-w-56 text-sm text-ink-soft">{empty}</p>
	{/each}
</Popover>
