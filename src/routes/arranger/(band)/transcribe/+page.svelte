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
	 * Keys on a computer: Space plays and pauses; while fixing the beats,
	 * ← → pick the beat before or after (its menu opens), Alt+← → move the
	 * picked beat a little, Enter says a bar starts on it; ⌘Z undoes the
	 * last change to the beats; L cycles the open bar, C turns the cycle on
	 * and off (Logic's), Escape closes the menu, Home
	 * goes back to the start, comma and full stop a bar back or on (Logic's).
	 */
	import { onDestroy, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import { soloSafeWhile } from '$lib/arranger/mixer/mixer.svelte.js';
	import { BAND_CHANNELS } from '$lib/arranger/transcription/TranscribeBand.svelte.js';
	import { gridClicks } from '$lib/arranger/transcription/gridClicks.js';
	import { timeSignature } from '$lib/arranger/transcription/timeSignatures.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import TranscribeControls from '$lib/arranger/components/transcription/TranscribeControls.svelte';
	import TranscriptionGrid from '$lib/arranger/components/transcription/TranscriptionGrid.svelte';
	import SendToArranger from '$lib/arranger/components/transcription/SendToArranger.svelte';
	import TranscribeSetup from '$lib/arranger/components/transcription/TranscribeSetup.svelte';
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
	// Arriving with a song sent from a transcription brings that transcription back (only on
	// arriving: Send to the arranger opens the song it makes while still here)
	let arrived = false;
	$effect(() => {
		if (!song.ready) return;
		if (song.recording) untrack(() => transcription.reopenSongsRecording());
		else if (!arrived && song.madeFrom) untrack(() => transcription.openWhatItWasMadeFrom());
		arrived = true;
	});
	/** A file from this device can't be reopened by the page: its name, to pick it again. */
	const fileToOpenAgain = $derived.by(() => {
		const wanted = song.recording ?? song.madeFrom;
		return wanted?.key.startsWith('file:') && transcription.recording?.key !== wanted.key
			? wanted.name
			: null;
	});

	// Leave first: opening it here would bring its transcription straight back
	async function backToArranger() {
		const back = transcription.returnTo;
		if (!back) return;
		transcription.returnTo = null;
		await goto(resolve('/arranger'));
		await song.open(back.id);
	}

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
		transcription.hearLevels();
	});

	/** @param {KeyboardEvent} event @returns {(() => void) | undefined} */
	function keyAction(event) {
		const beat = transcription.selectedBeat;
		if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey)
			return () => transcription.undoBeats();
		return (transcription.fixingBeats && beatKeyAction(event, beat)) || otherKeyAction(event);
	}

	/**
	 * Keys that pick and move beats: only while fixing them.
	 * @param {KeyboardEvent} event
	 * @param {number | null} beat the picked beat
	 */
	function beatKeyAction(event, beat) {
		if (event.key === 'ArrowLeft')
			return event.altKey
				? () => transcription.nudgeBeat(-NUDGE_SECONDS)
				: () => transcription.openBeatMenu((beat ?? 1) - 1);
		if (event.key === 'ArrowRight')
			return event.altKey
				? () => transcription.nudgeBeat(NUDGE_SECONDS)
				: () => transcription.openBeatMenu((beat ?? -1) + 1);
		if (event.key === 'Enter' && beat !== null) return () => transcription.barStartsHere();
	}

	/** @param {KeyboardEvent} event */
	function otherKeyAction(event) {
		if (event.key === 'Escape') return () => transcription.closeMenus();
		if (event.key === 'Home') return () => transcription.startOver();
		if (event.key === ',') return () => transcription.stepBar(-1);
		if (event.key === '.') return () => transcription.stepBar(1);
		const bar = transcription.bar;
		if ((event.key === 'l' || event.key === 'L') && bar)
			return () => transcription.cycle.toggleBar(bar.number);
		if (event.key === 'c' || event.key === 'C')
			return () => transcription.cycle.turn(!transcription.cycle.on);
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
		<div class="flex flex-wrap items-center gap-2">
			{#if transcription.returnTo}
				<button
					type="button"
					class="ui-button px-4 py-2 text-sm"
					onclick={backToArranger}
					use:tooltip={TIPS.transcription.backToArranger}
					>‹ Back to {transcription.returnTo.name}</button
				>
			{/if}
			{#if !transcription.setupStep && transcription.linked}
				<SendToArranger />
			{/if}
		</div>
	</div>

	{#if fileToOpenAgain && !transcription.recording}
		<p class="text-sm text-ink-soft">
			This song was written from <strong>{fileToOpenAgain}</strong>. Open it again to carry on.
		</p>
	{/if}

	{#if transcription.setupStep}
		<TranscribeSetup {transcription} />
	{:else if transcription.recording && transcription.grid}
		<div class="flex flex-wrap items-center gap-3">
			<SongBar />
			<span class="text-sm text-ink-soft"
				>Recording: <strong>{transcription.recording.name}</strong></span
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => transcription.chooseRecordingAgain()}
				use:tooltip={TIPS.transcription.changeRecording}>Change…</button
			>
		</div>
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
</main>
