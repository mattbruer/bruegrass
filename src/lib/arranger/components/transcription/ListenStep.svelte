<script>
	/**
	 * Setup's last step: listen through with the count clicks (higher on
	 * ONE). Where "one" drifts (a crooked bar in a live solo, or a beat the
	 * finder got wrong), put the playhead on the real "one", or tap it while
	 * it plays, and press "One" is here: nothing to count. + New part marks
	 * where each part starts (type its name), and Done waits for every part
	 * to be named, start to end.
	 */
	import { onMount } from 'svelte';
	import TranscriptionGrid from './TranscriptionGrid.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { formatClock } from '$lib/utils/formatClock.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Within this much of the end counts as having played to the end. */
	const END_SECONDS = 3;

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);

	// Named before (coming back to fix things): no need to play it all again
	let furthest = $state(transcription.sections.length > 1 ? Infinity : 0);
	$effect(() => {
		if (player.time > furthest) furthest = player.time;
	});
	const heardToTheEnd = $derived(furthest >= player.duration - END_SECONDS);

	onMount(() => {
		if (!transcription.firstPartNamed) transcription.nameFirstPart();
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1 text-lg">
		<p>Play and listen. The high click should land on “one” of every bar.</p>
		<p>
			Where it doesn’t, put the playhead on the real “one”, or tap it while it plays, and press
			“One” is here.
		</p>
		<p>Where a new part starts, press + New part and type its name.</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="big ui-button"
			onclick={() => (player.playing ? player.pause() : player.play())}
			use:tooltip={TIPS.transcription.play}
		>
			{player.playing ? '❚❚ Pause' : '▶ Play'}
		</button>
		<button
			type="button"
			class="ui-button px-4 py-2"
			onclick={() => player.seek(0)}
			use:tooltip={TIPS.transcription.fromTheStart}>⏮ From the start</button
		>
		<span class="text-lg text-ink-soft tabular-nums"
			>{formatClock(player.time, { tenths: true })} / {formatClock(player.duration)}</span
		>
		<SpeedControl {player} />
		<ZoomControl zoom={settings.transcribe.zoom} />
	</div>

	<div class="flex flex-wrap gap-3">
		<button
			type="button"
			class="big ui-button"
			onclick={() => transcription.oneIsHere()}
			use:tooltip={TIPS.transcription.oneIsHere}>“One” is here</button
		>
		<button
			type="button"
			class="big ui-button"
			onclick={() => transcription.markHere()}
			use:tooltip={TIPS.transcription.markHere}>+ New part</button
		>
	</div>

	<TranscriptionGrid {transcription} view="setup" />

	{#if transcription.sections.length > 0}
		<ol class="flex flex-col divide-y divide-line ui-well">
			{#each transcription.sections as section (section.index)}
				<li class="flex flex-wrap items-center gap-3 px-4 py-2">
					<span class="text-lg font-semibold">{section.name}</span>
					<span class="text-ink-soft tabular-nums"
						>{section.from === section.to
							? `bar ${section.from}`
							: `bars ${section.from}–${section.to}`}</span
					>
					<span class="ml-auto flex gap-2">
						<button
							type="button"
							class="ui-button px-3 py-1.5"
							onclick={() => transcription.playFromBar(section.from)}
							aria-label="Play {section.name}"
							use:tooltip={TIPS.transcription.hearPart}>▶</button
						>
						{#if section.from !== transcription.bars[0]?.number}
							<button
								type="button"
								class="ui-button px-3 py-1.5"
								onclick={() => transcription.setMarker(section.from, '')}
								aria-label="Remove {section.name}"
								use:tooltip={TIPS.transcription.removePart}>✕</button
							>
						{/if}
					</span>
				</li>
			{/each}
		</ol>
	{/if}

	<div class="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
		{#if transcription.firstPartNamed && heardToTheEnd}
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.doneListening()}
				use:tooltip={TIPS.transcription.doneNaming}>Done</button
			>
		{:else if !transcription.firstPartNamed}
			<span class="text-lg text-ink-soft">Name the part the song starts with.</span>
		{:else}
			<span class="text-lg text-ink-soft">Keep going to the end of the song.</span>
		{/if}
	</div>
</div>

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
