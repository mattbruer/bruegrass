<script>
	/**
	 * Transcribe a song from a recording, Logic's way: open a recording and
	 * its beats are found; say its time signature to lay out the bars, and
	 * slide it along the ruler so its ONE is on a bar line (a pickup in bar 1).
	 * The ruler follows the recording. Write the song on those bars in the track
	 * grid (chords by beat in their lane), the tune in the piano roll below
	 * (or, with the Band lane picked, the chart as text).
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
	import PartPane from '$lib/arranger/components/tracks/PartPane.svelte';
	import ArrangementEditor from '$lib/arranger/components/editor/ArrangementEditor.svelte';
	import { BAND_LANE } from '$lib/arranger/transcription/TranscriptionState.svelte.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import TimeSignatureSelect from '$lib/arranger/components/transcription/TimeSignatureSelect.svelte';
	import TranscriptionKeySelect from '$lib/arranger/components/transcription/TranscriptionKeySelect.svelte';
	import ChooseTime from '$lib/arranger/components/transcription/ChooseTime.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Alt+arrow moves the picked beat by this much. */
	const NUDGE_SECONDS = 0.005;

	// The work lives on the arranger, so leaving for another page and coming back carries on
	const { transcription, song, layout } = useArranger();
	transcription.arrive();
	onDestroy(() => transcription.leave());
	// The lanes' solos decide whether the band is heard here, not the mixer's
	onDestroy(soloSafeWhile(BAND_CHANNELS));

	// Arriving with a song written from one of the app's recordings opens it (only when the song
	// changes: picking another recording here mustn't bring this one back)
	// Arriving with a song sent from a transcription brings that transcription back (only on
	// arriving: Send to Tracks opens the song it makes while still here)
	let arrived = false;
	$effect(() => {
		if (!song.ready) return;
		if (song.reference) untrack(() => transcription.reopenSongsReference());
		else if (!arrived && song.madeFrom) untrack(() => transcription.openWhatItWasMadeFrom());
		arrived = true;
	});
	/** A file from this device can't be reopened by the page: its name, to pick it again. */
	const fileToOpenAgain = $derived.by(() => {
		const wanted = song.reference ?? song.madeFrom;
		return wanted?.key.startsWith('file:') && transcription.reference?.key !== wanted.key
			? wanted.name
			: null;
	});

	// Leave first: opening it here would bring its transcription straight back
	async function backToArranger() {
		const back = transcription.returnTo;
		if (!back) return;
		transcription.returnTo = null;
		await goto(resolve('/arranger/tracks'));
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

	// Playing stops where the trimmed recording ends
	$effect(() => {
		void transcription.player.time;
		untrack(() => transcription.stopAtTheEnd());
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
		if (event.defaultPrevented || !transcription.grid || inControl) return;
		const action = keyAction(event);
		if (!action) return;
		event.preventDefault();
		action();
	}

	/** What the part pane's roll and score follow: the recording's place in the song. */
	const transcriptionClock = {
		get playing() {
			return transcription.player.playing;
		},
		quarters: () => transcription.quartersNow,
		/** @param {number} quarters */
		seek: (quarters) => transcription.seekToQuarters(quarters)
	};
</script>

<svelte:head>
	<title>Transcribe · Bluegrass Arranger</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<main class="ui-page-width flex flex-col gap-4 pt-6" style:padding-bottom={layout.bottomSpace}>
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

	{#if fileToOpenAgain && !transcription.reference}
		<p class="text-sm text-ink-soft">
			This song was written from <strong>{fileToOpenAgain}</strong>. Open it again to carry on.
		</p>
	{/if}

	{#if transcription.setupStep}
		<TranscribeSetup {transcription} />
	{:else if transcription.reference && transcription.grid}
		<div class="flex flex-wrap items-center gap-3">
			{#if transcription.linked}<SongBar />{/if}
			<span class="text-sm text-ink-soft"
				>Reference: <strong>{transcription.reference.name}</strong></span
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => transcription.chooseReferenceAgain()}
				use:tooltip={TIPS.transcription.changeReference}>Change…</button
			>
			{#if transcription.timeChosen}
				<TimeSignatureSelect {transcription} />
				<TranscriptionKeySelect {transcription} />
			{/if}
		</div>
		<TranscribeControls {transcription} />
		{#if !transcription.timeChosen}
			<ChooseTime {transcription} />
		{:else if !transcription.linked}
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
		{#if transcription.linked && transcription.lane === BAND_LANE}
			<section class="ui-card p-3 sm:p-4" aria-label="The chart"><ArrangementEditor /></section>
		{:else if transcription.linked}
			<PartPane
				voice={transcription.lane}
				name={transcription.laneName(transcription.lane)}
				clock={transcriptionClock}
				bind:view={settings.transcribe.bottomView}
				bassStartsEmpty
				keyMenu={false}
				pickupBar={transcription.pickupBar}
				onPick={(id) => (transcription.lane = id)}
			/>
		{/if}
	{/if}
</main>
