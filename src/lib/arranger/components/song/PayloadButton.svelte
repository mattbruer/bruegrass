<script>
	/** Dev only: shows what a database sync would send for the open song. */
	import { useArranger } from '../../state/context.js';
	import { songPayload } from '../../state/songPayload.js';
	import Dialog from '$lib/components/Dialog.svelte';
	import JsonTree from '$lib/components/JsonTree.svelte';

	const arranger = useArranger();

	let open = $state(false);
	let payload = $state.raw(null);
	let text = $derived(JSON.stringify(payload, null, 2));

	async function show() {
		payload = await songPayload(arranger);
		open = true;
	}

	let kilobytes = $derived((new Blob([text]).size / 1024).toFixed(1));
</script>

<button type="button" class="ui-button px-4 py-2" onclick={show}>Payload</button>

<Dialog bind:open title="Sync payload" full>
	<div class="flex min-h-0 flex-1 flex-col gap-4 px-6 pt-4 pb-6">
		<div class="flex items-center justify-between gap-4">
			<p class="text-sm text-ink-soft">{kilobytes} KB · audio not included</p>
			<!-- svelte-ignore a11y_autofocus -->
			<button
				type="button"
				class="ui-button px-4 py-2"
				autofocus
				onclick={() => navigator.clipboard.writeText(text)}
			>
				Copy
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-auto ui-well p-4 font-mono text-xs leading-relaxed">
			<JsonTree value={payload} />
		</div>
	</div>
</Dialog>
