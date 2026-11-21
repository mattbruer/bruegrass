<script>
	/**
	 * The ▾ beside the Cycle button: pick one of the named sections to cycle
	 * (from its marker to the next marker or End).
	 */
	import Popover from '$lib/components/Popover.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const cycle = $derived(transcription.cycle);
</script>

<Popover class="px-1 text-xs" tip={TIPS.transcription.cycleSections}>
	{#snippet button()}<span aria-hidden="true">▾</span><span class="sr-only">Cycle a section</span
		>{/snippet}
	{#each cycle.sections as section (section.number)}
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-left text-sm"
			class:ui-button-on={cycle.isRegion(section.region)}
			onclick={() => cycle.set(section.region)}
			use:tooltip={TIPS.transcription.cycleSection}
			>{section.name} <span class="text-ink-soft tabular-nums">bar {section.number}</span></button
		>
	{:else}
		<p class="max-w-56 text-sm text-ink-soft">
			No named sections yet. Put a marker on a bar to start one.
		</p>
	{/each}
</Popover>
