<script>
	/** Dev only: shows what a database sync would send for the open song. */
	import { useArranger } from '../../state/context.js';
	import { songPayload } from '../../state/songPayload.js';
	import Dialog from '$lib/components/Dialog.svelte';

	const arranger = useArranger();

	let open = $state(false);
	let text = $state('');

	async function show() {
		text = JSON.stringify(await songPayload(arranger), null, 2);
		open = true;
	}

	let kilobytes = $derived((new Blob([text]).size / 1024).toFixed(1));
</script>

<button type="button" class="ui-button px-4 py-2" onclick={show}>Payload</button>

<Dialog bind:open title="Sync payload ({kilobytes} KB, audio not included)">
	<button
		type="button"
		class="mb-2 ui-button px-3 py-1"
		onclick={() => navigator.clipboard.writeText(text)}
	>
		Copy
	</button>
	<pre class="max-h-[70vh] overflow-auto text-xs whitespace-pre-wrap">{text}</pre>
</Dialog>
