<script>
	/**
	 * Where you write the song, in a drawer above the player bar: the chords
	 * (the arrangement) or the melody (ABC), one at a time. The chart and
	 * sheet music above it change as you type.
	 */
	import BottomDrawer from '../page/BottomDrawer.svelte';
	import ArrangementEditor from './ArrangementEditor.svelte';
	import MelodyPanel from '../melody/MelodyPanel.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';

	const TABS = [
		{ id: 'chords', name: 'Chords' },
		{ id: 'melody', name: 'Melody' }
	];

	let tab = $state('chords');
</script>

<BottomDrawer id="edit" title="Edit" closeTip={TIPS.editor.close}>
	{#snippet heading()}
		<TabSwitch tabs={TABS} bind:value={tab} tips={TIPS.editor.tabs} label="Edit" />
	{/snippet}

	{#if tab === 'chords'}
		<ArrangementEditor />
	{:else}
		<MelodyPanel />
	{/if}
</BottomDrawer>
