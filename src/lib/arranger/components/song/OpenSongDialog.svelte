<script>
	/**
	 * Your saved songs, newest first: open one, or delete it.
	 * Opening replaces what's on the page, so it asks first if that has
	 * unsaved changes.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { okToDiscardChanges } from '../../state/guardUnsavedChanges.svelte.js';
	import { formatSavedDate } from './formatSavedDate.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	const { song } = useArranger();

	// The list is read fresh each time the dialog opens
	$effect(() => {
		if (open) song.refreshSavedSongs();
	});

	/** @param {string} id */
	function openSong(id) {
		if (!okToDiscardChanges(song)) return;
		song.open(id);
		open = false;
	}

	/** @param {import('$lib/storage/arrangements.js').Arrangement} saved */
	function deleteSong(saved) {
		if (!confirm(`Delete “${saved.title}” for good?`)) return;
		song.delete(saved.id);
	}
</script>

<Dialog bind:open title="Your songs">
	<div class="px-6 pt-5 pb-6">
		{#if song.savedSongs.length === 0}
			<p class="ui-well p-4 text-sm text-ink-soft">
				No saved songs yet. Press Save to keep the song you're working on.
			</p>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each song.savedSongs as saved (saved.id)}
					{@const isOpen = saved.id === song.savedId}
					<li class="flex items-center gap-2">
						<button
							type="button"
							class="min-w-0 flex-1 ui-button px-4 py-2 text-left"
							class:ui-button-on={isOpen}
							aria-current={isOpen ? 'true' : undefined}
							onclick={() => openSong(saved.id)}
							use:tooltip={TIPS.song.openSaved}
						>
							<span class="block truncate">{saved.title}</span>
							<span class="block text-xs font-normal text-ink-soft">
								{isOpen ? 'Open now · ' : ''}saved {formatSavedDate(saved.updatedAt)}
							</span>
						</button>
						<button
							type="button"
							class="ui-button px-3 py-2 text-sm text-danger"
							aria-label="Delete {saved.title}"
							onclick={() => deleteSong(saved)}
							use:tooltip={TIPS.song.deleteSaved}
						>
							Delete
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Dialog>
