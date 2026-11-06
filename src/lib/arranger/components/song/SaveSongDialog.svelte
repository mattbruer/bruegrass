<script>
	/**
	 * Asks for a name the first time a song is saved (suggesting the tune's
	 * title), then saves it.
	 */
	import NameDialog from '$lib/components/NameDialog.svelte';
	import { useArranger } from '../../state/context.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const { song } = useArranger();
</script>

<NameDialog
	bind:open
	title="Save song"
	suggestedName={song.suggestedName}
	onsave={(name) => song.save(name)}
/>
