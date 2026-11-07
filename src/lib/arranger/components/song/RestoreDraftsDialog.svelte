<script>
	/**
	 * When the page opens with unsaved changes from last time (see
	 * state/drafts.svelte.js): offer them back, or throw them away.
	 *
	 * Closing it without choosing restores them: nothing is ever lost by
	 * accident, and New or Open will still ask before discarding them.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { discardDrafts, drafts, restoreDrafts } from '../../state/drafts.svelte.js';
	import { formatSavedDate } from './formatSavedDate.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();

	let offer = $derived(drafts.offer);

	function restore() {
		restoreDrafts(arranger);
	}
</script>

<Dialog
	bind:open={() => offer !== null, (isOpen) => !isOpen && offer && restore()}
	title="Pick up where you left off?"
>
	{#if offer}
		<div class="px-6 pt-4 pb-6">
			<p class="max-w-md text-sm">You have unsaved changes from last time:</p>
			<ul class="mt-3 flex flex-col gap-2 ui-well p-4 text-sm">
				{#if offer.song}
					<li>
						<strong>{offer.song.name || 'Your new song'}</strong>
						<span class="block text-xs text-ink-soft"
							>changed {formatSavedDate(offer.song.savedAt)}</span
						>
					</li>
				{/if}
				{#if offer.setup}
					<li>
						EQ changes to your listening setup <strong>{offer.setup.setupName}</strong>
						<span class="block text-xs text-ink-soft"
							>changed {formatSavedDate(offer.setup.savedAt)}</span
						>
					</li>
				{/if}
			</ul>
			<p class="mt-3 max-w-md text-xs text-ink-soft">
				Restoring puts them back as unsaved changes, so you can keep working and Save.
			</p>

			<div class="mt-5 flex justify-end gap-3">
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => discardDrafts(arranger)}
					use:tooltip={TIPS.drafts.discard}
				>
					Discard
				</button>
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					onclick={restore}
					use:tooltip={TIPS.drafts.restore}
				>
					Restore
				</button>
			</div>
		</div>
	{/if}
</Dialog>
