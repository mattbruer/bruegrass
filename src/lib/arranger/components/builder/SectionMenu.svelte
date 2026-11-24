<script>
	/** A part's ⋯ menu in the chart builder: move, copy, repeat another part, delete. */
	import Popover from '$lib/components/Popover.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import {
		deleteSection,
		duplicateSection,
		moveSection,
		sectionsToRepeat,
		setRepeat
	} from '../../builder/chartEdits.js';

	/**
	 * @type {{
	 *   chart: import('../../chart/writtenChart.js').WrittenChart,
	 *   index: number,
	 *   edit: import('./builder.js').Edit
	 * }}
	 */
	let { chart, index, edit } = $props();

	let section = $derived(chart.sections[index]);
	let others = $derived(sectionsToRepeat(chart, index));
</script>

<Popover class="px-2 py-1 text-sm" align="right" tip={TIPS.builder.sectionMenu}>
	{#snippet button()}<span aria-hidden="true">⋯</span><span class="sr-only"
			>{section.name}’s menu</span
		>{/snippet}
	<button
		type="button"
		class="ui-button ui-menu-item"
		disabled={index === 0}
		use:tooltip={TIPS.builder.moveUp}
		onclick={() => edit((c) => moveSection(c, index, -1), null)}>Move up</button
	>
	<button
		type="button"
		class="ui-button ui-menu-item"
		disabled={index === chart.sections.length - 1}
		use:tooltip={TIPS.builder.moveDown}
		onclick={() => edit((c) => moveSection(c, index, 1), null)}>Move down</button
	>
	<button
		type="button"
		class="ui-button ui-menu-item"
		use:tooltip={TIPS.builder.duplicate}
		onclick={() => edit((c) => duplicateSection(c, index), null)}>Copy this part</button
	>
	{#if section.repeats}
		<button
			type="button"
			class="ui-button ui-menu-item"
			use:tooltip={TIPS.builder.ownCopy}
			onclick={() => edit((c) => setRepeat(c, index, null), null)}>Give it its own bars</button
		>
	{:else if others.length}
		<span class="ui-menu-heading">Play again</span>
		{#each others as other (other.name)}
			<button
				type="button"
				class="ui-button ui-menu-item"
				use:tooltip={TIPS.builder.repeatOf}
				onclick={() => edit((c) => setRepeat(c, index, other.name), null)}>{other.name}</button
			>
		{/each}
	{/if}
	<button
		type="button"
		class="ui-button ui-menu-item text-danger"
		use:tooltip={TIPS.builder.deleteSection}
		onclick={() => edit((c) => deleteSection(c, index), null)}>Delete part</button
	>
</Popover>
