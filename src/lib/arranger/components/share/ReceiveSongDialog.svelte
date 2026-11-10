<script>
	/**
	 * A song someone sent (state/ReceiveState.svelte.js): what's in it, and
	 * Open it. If you already have it (sent before, or it's yours), Update
	 * your copy or Keep both. Afterwards, anything worth knowing. It waits
	 * while last time's drafts are being offered, so only one asks at a time.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { okToDiscardChanges } from '../../state/guardUnsavedChanges.svelte.js';
	import { drafts } from '../../state/drafts.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { receive, song } = useArranger();

	let open = $derived(receive.showing && !drafts.offer);
	let offer = $derived(receive.offer);
	let takeCount = $derived(offer?.songPackage.takes.length ?? 0);
	let title = $derived(offer?.songPackage.song.title ?? 'Song received');

	/** @param {boolean} asNewSong */
	function openIt(asNewSong) {
		if (!okToDiscardChanges(song)) return;
		receive.accept({ asNewSong });
	}
</script>

<Dialog bind:open={() => open, (wanted) => !wanted && receive.close()} {title}>
	<div class="flex flex-col gap-3 px-6 pt-4 pb-6 text-sm">
		{#if offer}
			<p>
				A song sent to you{takeCount > 0
					? `, with ${takeCount} recorded take${takeCount === 1 ? '' : 's'}`
					: ''}. Opening it saves it among your songs.
			</p>
			{#if offer.yourCopy}
				<p class="ui-well p-3 text-ink-soft">
					You already have this song (“{offer.yourCopy.title}”). Update it with what was sent, or
					keep both. Takes recorded on your copy are kept either way.
				</p>
			{/if}
		{/if}

		{#if receive.problem}
			<p class="text-danger" role="alert">{receive.problem}</p>
		{/if}

		{#if receive.notes.length > 0}
			<ul class="flex list-disc flex-col gap-1 pl-5" role="status">
				{#each receive.notes as note (note)}
					<li>{note}</li>
				{/each}
			</ul>
		{/if}

		<div class="mt-2 flex flex-wrap justify-end gap-3">
			<button type="button" class="ui-button px-4 py-2" onclick={() => receive.close()}>
				{offer ? 'Cancel' : 'Close'}
			</button>
			{#if offer?.yourCopy}
				<button
					type="button"
					class="ui-button px-4 py-2"
					disabled={receive.busy}
					onclick={() => openIt(true)}
					use:tooltip={TIPS.receive.keepBoth}
				>
					Keep both
				</button>
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					disabled={receive.busy}
					onclick={() => openIt(false)}
					use:tooltip={TIPS.receive.update}
				>
					{receive.busy ? 'Opening…' : 'Update my copy'}
				</button>
			{:else if offer}
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					disabled={receive.busy}
					onclick={() => openIt(false)}
					use:tooltip={TIPS.receive.open}
				>
					{receive.busy ? 'Opening…' : 'Open it'}
				</button>
			{/if}
		</div>
	</div>
</Dialog>
