<script>
	/**
	 * Transcribe a song from a recording, Logic's way: open a recording and
	 * it becomes the open song's recording: you place beat 1 of bar 1 (a
	 * pickup stays before it), then its beats and bars are found through it
	 * and the ruler follows them. Write the song on those bars in the track
	 * grid (chords by beat in their lane), the tune in the piano roll below.
	 * No band plays here: this page is for writing the song down; the band
	 * is for practising. Desktop first; the phone gets its own layout later.
	 *
	 * Keys on a computer: Space plays and pauses, ← → pick the beat before or
	 * after (its menu opens), Alt+← → move the picked beat a little, Enter
	 * says a bar starts on it, L cycles the open bar, C turns the cycle on
	 * and off (Logic's), Escape closes the menu, Home
	 * goes back to the start, comma and full stop a bar back or on (Logic's).
	 */
	import { onDestroy, untrack } from 'svelte';
	import { useArranger } from '$lib/arranger/state/context.js';
	import { soloSafeWhile } from '$lib/arranger/mixer/mixer.svelte.js';
	import { BAND_CHANNELS } from '$lib/arranger/transcription/TranscribeBand.svelte.js';
	import { gridClicks } from '$lib/arranger/transcription/gridClicks.js';
	import { timeSignature } from '$lib/arranger/transcription/timeSignatures.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import RecordingChoice from '$lib/arranger/components/transcription/RecordingChoice.svelte';
	import DownbeatPicker from '$lib/arranger/components/transcription/DownbeatPicker.svelte';
	import AnalysingRecording from '$lib/arranger/components/transcription/AnalysingRecording.svelte';
	import TranscribeControls from '$lib/arranger/components/transcription/TranscribeControls.svelte';
	import TranscriptionGrid from '$lib/arranger/components/transcription/TranscriptionGrid.svelte';
	import SendToArranger from '$lib/arranger/components/transcription/SendToArranger.svelte';
	import BottomPane from '$lib/arranger/components/transcription/BottomPane.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Alt+arrow moves the picked beat by this much. */
	const NUDGE_SECONDS = 0.005;

	// The work lives on the arranger, so leaving for another page and coming back carries on
	const { transcription, song } = useArranger();
	onDestroy(() => transcription.leave());
	// The lanes' solos decide whether the band is heard here, not the mixer's
	onDestroy(soloSafeWhile(BAND_CHANNELS));

	// Arriving with a song written from one of the app's recordings opens it (only when the song
	// changes: picking another recording here mustn't bring this one back)
	$effect(() => {
		if (song.ready && song.recording) untrack(() => transcription.reopenSongsRecording());
	});
	/** A file from this device can't be reopened by the page: its name, to pick it again. */
	const fileToOpenAgain = $derived(
		song.recording?.key.startsWith('file:') && transcription.recording?.key !== song.recording.key
			? song.recording.name
			: null
	);

	$effect(() => {
		const grid = transcription.grid;
		transcription.player.setClicks(
			grid && transcription.clicksOn
				? gridClicks(grid, transcription.bars, timeSignature(transcription.time).clickBeats)
				: { times: [], accents: [] }
		);
	});

	$effect(() => {
		transcription.player.setLoop(transcription.cycle.seconds);
	});

	$effect(() => {
		transcription.player.setNotes(transcription.heardNotes);
	});

	$effect(() => {
		transcription.hearLevels();
	});

	/** @param {KeyboardEvent} event @returns {(() => void) | undefined} */
	function keyAction(event) {
		const beat = transcription.selectedBeat;
		if (event.key === 'ArrowLeft')
			return event.altKey
				? () => transcription.nudgeBeat(-NUDGE_SECONDS)
				: () => transcription.openBeatMenu((beat ?? 1) - 1);
		if (event.key === 'ArrowRight')
			return event.altKey
				? () => transcription.nudgeBeat(NUDGE_SECONDS)
				: () => transcription.openBeatMenu((beat ?? -1) + 1);
		if (event.key === 'Escape') return () => transcription.closeMenus();
		if (event.key === 'Home') return () => transcription.startOver();
		if (event.key === ',') return () => transcription.stepBar(-1);
		if (event.key === '.') return () => transcription.stepBar(1);
		const bar = transcription.bar;
		if ((event.key === 'l' || event.key === 'L') && bar)
			return () => transcription.cycle.toggleBar(bar.number);
		if (event.key === 'c' || event.key === 'C')
			return () => transcription.cycle.turn(!transcription.cycle.on);
		if (event.key === 'Enter' && beat !== null) return () => transcription.barStartsHere();
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		const target = event.target;
		const inControl =
			target instanceof Element &&
			target.closest('input, select, textarea, button, summary, [role="application"]');
		if (event.defaultPrevented || !transcription.grid || transcription.settingDownbeat || inControl)
			return;
		const action = keyAction(event);
		if (!action) return;
		event.preventDefault();
		action();
	}
</script>

<svelte:head>
	<title>Transcribe · Bluegrass Arranger</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<main class="ui-page-width flex flex-col gap-4 pt-6 pb-16">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-bold">Transcribe</h1>
		{#if transcription.grid && transcription.linked}
			<SendToArranger />
		{/if}
	</div>

	<SongBar />

	<RecordingChoice
		current={transcription.recording}
		onChoose={(recording) => transcription.open(recording)}
	/>

	{#if fileToOpenAgain}
		<p class="text-sm text-ink-soft">
			This song was written from <strong>{fileToOpenAgain}</strong>. Open it again (Open a
			recording…) to carry on.
		</p>
	{/if}

	{#if transcription.recording}
		{#if transcription.player.loading}
			<p class="text-ink-soft">Loading…</p>
		{:else if transcription.finding}
			<AnalysingRecording />
		{:else if transcription.settingDownbeat}
			<TranscribeControls {transcription} />
			<DownbeatPicker {transcription} />
		{:else if transcription.grid}
			<TranscribeControls {transcription} />
			{#if !transcription.linked}
				<p class="text-sm text-ink-soft">
					The song open now isn’t this recording’s.
					<button
						type="button"
						class="ml-2 ui-button px-3 py-1.5"
						onclick={() => transcription.startSong()}
						use:tooltip={TIPS.transcription.startSong}>Use it for a new song</button
					>
				</p>
			{/if}
			<TranscriptionGrid {transcription} />
			<BottomPane {transcription} />
		{/if}
	{/if}
</main>
