<script>
	/**
	 * The song that's open: its name, whether it has unsaved changes, and
	 * New, Open and Save. Cmd/Ctrl+S saves too.
	 */
	import { useArranger } from '../../state/context.js';
	import { okToDiscardChanges } from '../../state/guardUnsavedChanges.svelte.js';
	import SaveSongDialog from './SaveSongDialog.svelte';
	import OpenSongDialog from './OpenSongDialog.svelte';
	import UnsavedDot from '$lib/components/UnsavedDot.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { song } = useArranger();

	let saveDialogOpen = $state(false);
	let openDialogOpen = $state(false);

	let displayName = $derived(song.isNew ? 'New song' : song.name);
	let status = $derived.by(() => {
		if (song.isNew) return 'Not saved yet';
		return song.hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
	});
	/** Nothing to save: a saved song with no changes. */
	let nothingToSave = $derived(!song.isNew && !song.hasUnsavedChanges);

	function startNewSong() {
		if (okToDiscardChanges(song)) song.startNew();
	}

	/** A new song needs a name first; a saved one just saves. */
	function save() {
		if (song.isNew) saveDialogOpen = true;
		else song.save();
	}

	function saveOnShortcut(/** @type {KeyboardEvent} */ event) {
		const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
		if (!isSaveShortcut) return;
		event.preventDefault(); // not the browser's "Save page"
		save();
	}
</script>

<svelte:window onkeydown={saveOnShortcut} />

<section class="mb-6 flex flex-wrap items-center gap-3" aria-label="Song">
	<div class="mr-auto min-w-0">
		<h2 class="flex items-center gap-2 truncate text-lg font-bold">
			{#if song.hasUnsavedChanges}
				<UnsavedDot />
			{/if}
			{displayName}
		</h2>
		<p class="text-sm text-ink-soft" aria-live="polite">{status}</p>
	</div>

	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={startNewSong}
		use:tooltip={TIPS.song.new}>New</button
	>
	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={() => (openDialogOpen = true)}
		use:tooltip={TIPS.song.open}
	>
		Open
	</button>
	<button
		type="button"
		class="ui-button px-5 py-2 ui-button-primary"
		disabled={nothingToSave}
		onclick={save}
		use:tooltip={TIPS.song.save}
	>
		Save
	</button>
</section>

<SaveSongDialog bind:open={saveDialogOpen} />
<OpenSongDialog bind:open={openDialogOpen} />
