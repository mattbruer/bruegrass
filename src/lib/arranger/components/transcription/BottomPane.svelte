<script>
	/**
	 * The piano roll under the track grid, like Logic's bottom pane: it edits
	 * the part picked in the grid, follows the recording while it plays, and
	 * starts an unwritten bass empty, to write by ear. The key is named in
	 * the row above, so the roll's own Key menu is left out.
	 */
	import MelodyDrawing from '../pianoRoll/MelodyDrawing.svelte';
	import { BASS_VOICE } from '../../bass/readBass.js';
	import { HARMONY_PARTS } from '../../melody/harmony/harmonyParts.js';
	import { settings } from '$lib/settings/settings.svelte.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const laneName = $derived(
		transcription.lane === BASS_VOICE
			? 'Bass'
			: (HARMONY_PARTS.find((part) => part.id === transcription.lane)?.name ?? 'Melody')
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
	<section class="flex flex-col gap-2 ui-card p-3 sm:p-4" aria-label="Piano roll">
		<h2 class="text-sm font-bold">Piano roll · {laneName}</h2>
		<MelodyDrawing
			voice={transcription.lane}
			{clock}
			bassStartsEmpty
			keyMenu={false}
			zoom={settings.transcribe.zoom}
		/>
	</section>
{/if}
