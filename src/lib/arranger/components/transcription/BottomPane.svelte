<script>
	/**
	 * The piano roll under the track grid, like Logic's bottom pane: it edits
	 * the part picked in the grid, follows the recording while it plays, and
	 * starts an unwritten bass empty, to write by ear. The key is named in
	 * the row above, so the roll's own Key menu is left out. Or the same
	 * part as sheet music (the tune with all its voices, or the bass line).
	 */
	import MelodyDrawing from '../pianoRoll/MelodyDrawing.svelte';
	import SheetMusic from '../melody/SheetMusic.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { BOTTOM_VIEWS } from '../../transcription/bottomViews.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { BASS_VOICE } from '../../bass/readBass.js';
	import { HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { settings } from '$lib/settings/settings.svelte.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const laneName = $derived(
		transcription.lane === BASS_VOICE
			? 'Bass'
			: (HARMONY_PARTS.find((part) => part.id === transcription.lane)?.name ??
					transcription.extraLanes.find((lane) => lane.id === transcription.lane)?.name ??
					'Melody')
	);

	const isBass = $derived(transcription.lane === BASS_VOICE);
	const sheetNotation = $derived(isBass ? transcription.arranger.bass.notation : undefined);
	const nothingWritten = $derived(
		(sheetNotation ?? transcription.arranger.melody.notation).trim() === ''
	);

	const clock = {
		get playing() {
			return transcription.player.playing;
		},
		quarters: () => transcription.quartersNow,
		/** @param {number} quarters */
		seek: (quarters) => transcription.seekToQuarters(quarters)
	};
</script>

{#if transcription.linked}
	<section class="flex flex-col gap-2 ui-card p-3 sm:p-4" aria-label="The picked part">
		<div class="flex flex-wrap items-center gap-3">
			<TabSwitch
				tabs={BOTTOM_VIEWS}
				bind:value={settings.transcribe.bottomView}
				tips={TIPS.transcription.bottomViews}
				label="Show the part as"
			/>
			<h2 class="text-sm font-bold">{laneName}</h2>
		</div>
		{#if settings.transcribe.bottomView === 'sheet'}
			{#if nothingWritten}
				<p class="text-sm text-ink-soft">Nothing written yet. Draw it in the piano roll.</p>
			{:else}
				<SheetMusic notation={sheetNotation} />
			{/if}
		{:else}
			<MelodyDrawing
				voice={transcription.lane}
				lanes={transcription}
				{clock}
				bassStartsEmpty
				keyMenu={false}
				zoom={settings.transcribe.zoom}
			/>
		{/if}
	</section>
{/if}
