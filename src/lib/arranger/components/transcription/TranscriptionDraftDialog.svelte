<script>
	/**
	 * Opening a recording with unsaved work on it from last time (its beats,
	 * chords, key, lanes): offer it back, or start the recording afresh.
	 * Closing it without choosing restores, so nothing is lost by accident.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { formatSavedDate } from '../song/formatSavedDate.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const offer = $derived(transcription.draftOffer);
</script>

<Dialog
	bind:open={() => offer !== null, (isOpen) => !isOpen && offer && transcription.restoreDraft()}
	title="Pick up where you left off?"
>
	{#if offer}
		<div class="px-6 pt-4 pb-6">
			<p class="max-w-md text-sm">
				You started transcribing <strong>{transcription.recording?.name}</strong> and didn’t save
				it. Your beats, chords and lanes were kept on this device
				<span class="text-ink-soft">({formatSavedDate(offer.savedAt)})</span>.
			</p>
			<div class="mt-5 flex justify-end gap-3">
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => transcription.discardDraft()}
					use:tooltip={TIPS.transcription.draftDiscard}
				>
					Start over
				</button>
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					onclick={() => transcription.restoreDraft()}
					use:tooltip={TIPS.transcription.draftRestore}
				>
					Restore
				</button>
			</div>
		</div>
	{/if}
</Dialog>
