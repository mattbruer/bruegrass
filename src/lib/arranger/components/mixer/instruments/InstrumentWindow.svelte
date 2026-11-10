<script>
	/**
	 * Choose what a tune channel plays on: every instrument, by family. Tapping
	 * one picks it and, while the band is stopped, plays a note on it; while
	 * it plays, the change is heard straight away.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { instrumentFamilies } from '../../../instruments/tuneInstruments.js';
	import { mixer } from '../../../playback/mixer.svelte.js';
	import { auditionNote } from '../../../playback/auditionNote.js';
	import { useArranger } from '../../../state/context.js';
	import { closeInstruments, instrumentWindow } from './instrumentWindowState.svelte.js';

	/** The note a choice is heard on: G above middle C, concert pitch. */
	const PREVIEW_NOTE = 67;

	const { player, arrangement } = useArranger();
	const families = instrumentFamilies();

	let channel = $derived(mixer.channels.find((each) => each.id === instrumentWindow.channelId));
	let open = $derived(channel !== undefined);

	/** @param {string} instrumentId */
	function choose(instrumentId) {
		if (!channel) return;
		channel.instrument = instrumentId;
		if (!player.isPlaying)
			auditionNote(PREVIEW_NOTE, arrangement.transpose, channel.id).catch(console.error);
	}
</script>

<Dialog
	bind:open={() => open, (isOpen) => !isOpen && closeInstruments()}
	title={channel ? `${channel.name} plays on` : 'Instrument'}
>
	{#if channel}
		<div class="flex flex-col gap-4 px-6 pt-4 pb-6">
			{#each families as { family, instruments } (family)}
				<section>
					<h3 class="mb-2 text-xs font-bold tracking-wider text-ink-soft uppercase">{family}</h3>
					<div class="choices">
						{#each instruments as instrument (instrument.id)}
							<button
								type="button"
								class="ui-button px-2 py-2 text-sm font-semibold"
								class:ui-button-on={channel.instrument === instrument.id}
								aria-pressed={channel.instrument === instrument.id}
								onclick={() => choose(instrument.id)}>{instrument.name}</button
							>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</Dialog>

<style>
	.choices {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: 0.5rem;
	}
</style>
