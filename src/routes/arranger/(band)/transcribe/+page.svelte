<script>
	/**
	 * Transcribe a song from a recording, Logic's way: open a recording and
	 * it becomes the open song's recording, its beats and bars found for you
	 * and the ruler following it. Write the song on those bars in the track
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
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import { TranscriptionState } from '$lib/arranger/transcription/TranscriptionState.svelte.js';
	import { gridClicks } from '$lib/arranger/transcription/gridClicks.js';
	import { timeSignature } from '$lib/arranger/transcription/timeSignatures.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import RecordingChoice from '$lib/arranger/components/transcription/RecordingChoice.svelte';
	import FindingBeats from '$lib/arranger/components/transcription/FindingBeats.svelte';
	import TranscribeControls from '$lib/arranger/components/transcription/TranscribeControls.svelte';
	import TranscriptionGrid from '$lib/arranger/components/transcription/TranscriptionGrid.svelte';
	import BottomPane from '$lib/arranger/components/transcription/BottomPane.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Alt+arrow moves the picked beat by this much. */
	const NUDGE_SECONDS = 0.005;

	const transcription = new TranscriptionState(useArranger());
	onDestroy(() => transcription.dispose());

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
		transcription.player.setLevels(transcription.levels);
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
		if (event.defaultPrevented || !transcription.grid || inControl) return;
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
	<div class="flex flex-wrap items-center gap-3">
		<a
			href={resolve('/arranger')}
			class="ui-button px-4 py-2 text-sm"
			use:tooltip={TIPS.transcription.back}
		>
			‹ Arranger
		</a>
		<h1 class="text-2xl font-bold">Transcribe</h1>
	</div>

	<SongBar />

	<RecordingChoice
		current={transcription.recording}
		onChoose={(recording) => transcription.open(recording)}
	/>

	{#if transcription.recording}
		{#if transcription.player.loading}
			<p class="text-ink-soft">Loading…</p>
		{:else if transcription.finding}
			<FindingBeats />
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
