<script>
	/**
	 * Asks for a name the first time a song is saved (suggesting the tune's
	 * title), then saves it.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const { song } = useArranger();

	let name = $state('');
	/** @type {HTMLInputElement | undefined} */
	let nameField = $state();

	// Each time it opens: suggest a name, ready to type over
	$effect(() => {
		if (!open) return;
		name = song.suggestedName;
		queueMicrotask(() => nameField?.select());
	});

	function save(/** @type {SubmitEvent} */ event) {
		event.preventDefault();
		song.save(name);
		open = false;
	}
</script>

<Dialog bind:open title="Save song">
	<form class="px-6 pt-5 pb-6" onsubmit={save}>
		<label class="block">
			<span class="mb-2 block font-semibold">Name</span>
			<input
				bind:this={nameField}
				bind:value={name}
				required
				maxlength="100"
				class="w-full ui-field px-3 py-2 pointer-coarse:text-base"
			/>
		</label>

		<div class="mt-5 flex justify-end gap-3">
			<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>
				Cancel
			</button>
			<button type="submit" class="ui-button px-5 py-2 ui-button-primary">Save</button>
		</div>
	</form>
</Dialog>
