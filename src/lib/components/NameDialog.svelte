<script>
	/**
	 * Asks for a name, then hands it back: for saving a song, an EQ preset or
	 * a listening setup. It opens with a suggested name selected, ready to
	 * type over, and can offer ready-made names to pick from.
	 *
	 * Usage:
	 *   <NameDialog bind:open title="Save song" suggestedName="My song" onsave={(name) => ...} />
	 */
	import Dialog from './Dialog.svelte';

	/**
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   suggestedName?: string,
	 *   suggestions?: readonly string[],
	 *   hint?: string,
	 *   saveLabel?: string,
	 *   onsave: (name: string) => void
	 * }}
	 *   suggestions: names offered in the field's drop-down (on top of typing your own);
	 *   hint: a line under the field explaining what's being named
	 */
	let {
		open = $bindable(false),
		title,
		suggestedName = '',
		suggestions = [],
		hint = '',
		saveLabel = 'Save',
		onsave
	} = $props();

	const suggestionsId = `name-suggestions-${Math.random().toString(36).slice(2, 8)}`;

	let name = $state('');
	/** @type {HTMLInputElement | undefined} */
	let nameField = $state();

	// Each time it opens: suggest a name, ready to type over
	$effect(() => {
		if (!open) return;
		name = suggestedName;
		queueMicrotask(() => nameField?.select());
	});

	function save(/** @type {SubmitEvent} */ event) {
		event.preventDefault();
		onsave(name.trim());
		open = false;
	}
</script>

<Dialog bind:open {title}>
	<form class="px-6 pt-5 pb-6" onsubmit={save}>
		<label class="block">
			<span class="mb-2 block font-semibold">Name</span>
			<input
				bind:this={nameField}
				bind:value={name}
				required
				maxlength="100"
				list={suggestions.length ? suggestionsId : undefined}
				class="w-full ui-field px-3 py-2 pointer-coarse:text-base"
			/>
		</label>
		{#if suggestions.length}
			<datalist id={suggestionsId}>
				{#each suggestions as suggestion (suggestion)}
					<option value={suggestion}></option>
				{/each}
			</datalist>
		{/if}
		{#if hint}
			<p class="mt-2 max-w-sm text-sm text-ink-soft">{hint}</p>
		{/if}

		<div class="mt-5 flex justify-end gap-3">
			<button type="button" class="ui-button px-4 py-2" onclick={() => (open = false)}>
				Cancel
			</button>
			<button type="submit" class="ui-button px-5 py-2 ui-button-primary">{saveLabel}</button>
		</div>
	</form>
</Dialog>
