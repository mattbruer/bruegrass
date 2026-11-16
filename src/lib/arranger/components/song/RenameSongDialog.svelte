<script>
	/** Give the open song a name of your own (songs save themselves, named for their tune). */
	import NameDialog from '$lib/components/NameDialog.svelte';
	import { useArranger } from '../../state/context.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const { song } = useArranger();
</script>

<NameDialog
	bind:open
	title="Rename song"
	suggestedName={song.name || song.suggestedName}
	onsave={(name) => song.rename(name).catch(console.error)}
/>
