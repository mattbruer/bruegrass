<script>
	/**
	 * The ▾ beside the Cycle button: the cycle a bar at a time (for a
	 * finger), and the named sections to cycle (from a section's start to the
	 * next section, or End). `empty`: what to say while there are none;
	 * `children`: more the host offers for the cycled bars, at the bottom.
	 */
	import CycleNudge from './CycleNudge.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @typedef {import('../../transcription/cycle.js').Cycle} Cycle */

	/**
	 * @type {{
	 *   cycle: {
	 *     region: Cycle | null,
	 *     sections: { number: number, label?: string, name: string, region: Cycle }[],
	 *     set: (region: Cycle) => void,
	 *     isRegion: (region: Cycle) => boolean
	 *   },
	 *   ruler: import('../../tracks/ruler.js').RulerBar[],
	 *   empty?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { cycle, ruler, empty = 'No sections yet.', children } = $props();
</script>

<Popover class="px-1 text-xs" tip={TIPS.cycle.sections}>
	{#snippet button()}<span aria-hidden="true">▾</span><span class="sr-only">Change the cycle</span
		>{/snippet}
	<CycleNudge {cycle} {ruler} />
	{#each cycle.sections as section (section.number)}
		<button
			type="button"
			class="ui-button ui-menu-item"
			class:ui-button-on={cycle.isRegion(section.region)}
			onclick={() => cycle.set(section.region)}
			use:tooltip={TIPS.cycle.section}
			>{section.name}
			<span class="text-ink-soft tabular-nums">bar {section.label ?? section.number}</span></button
		>
	{:else}
		<p class="max-w-56 text-sm text-ink-soft">{empty}</p>
	{/each}
	{@render children?.()}
</Popover>
