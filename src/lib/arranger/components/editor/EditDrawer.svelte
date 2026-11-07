<script>
	/**
	 * Where you write the song, in a drawer above the player bar: the chords
	 * (the arrangement) or the melody (ABC), one at a time. The chart and
	 * sheet music above it change as you type.
	 */
	import BottomDrawer from '../page/BottomDrawer.svelte';
	import ArrangementEditor from './ArrangementEditor.svelte';
	import MelodyPanel from '../melody/MelodyPanel.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const TABS = [
		{ id: 'chords', name: 'Chords' },
		{ id: 'melody', name: 'Melody' }
	];

	let tab = $state('chords');
</script>

<BottomDrawer id="edit" title="Edit" closeTip={TIPS.editor.close}>
	{#snippet heading()}
		<!-- A sunk well with the chosen tab raised -->
		<div class="flex w-fit ui-well rounded-[var(--corner-control)] p-0.5" role="tablist">
			{#each TABS as { id, name } (id)}
				{@const chosen = tab === id}
				<button
					type="button"
					role="tab"
					class="rounded-[var(--corner-control)] px-3 py-1 text-sm font-semibold"
					class:ui-button={chosen}
					class:text-accent={chosen}
					class:text-ink-soft={!chosen}
					aria-selected={chosen}
					onclick={() => (tab = id)}
					use:tooltip={TIPS.editor.tabs[id]}
				>
					{name}
				</button>
			{/each}
		</div>
	{/snippet}

	{#if tab === 'chords'}
		<ArrangementEditor />
	{:else}
		<MelodyPanel />
	{/if}
</BottomDrawer>
