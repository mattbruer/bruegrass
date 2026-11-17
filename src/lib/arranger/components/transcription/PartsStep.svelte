<script>
	/**
	 * Setup's last step: name every part of the song, start to end, on the
	 * track lane. Play and listen; + Marker puts a marker on the bar line
	 * nearest the playhead and opens its box to type the part's name (the
	 * same markers as the workspace, here with only the name in the bar's
	 * menu). Bar 1's box opens first, for what the song starts with. Each
	 * part lasts until the next. Done shows once the song has been played to
	 * the end (or its parts were named before), so none is left unnamed.
	 */
	import { onMount } from 'svelte';
	import TranscriptionGrid from './TranscriptionGrid.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Within this much of the end counts as having played to the end. */
	const END_SECONDS = 3;

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);

	// Named before (coming back to fix them): no need to play it all again
	let furthest = $state(transcription.sections.length > 1 ? Infinity : 0);
	$effect(() => {
		if (player.time > furthest) furthest = player.time;
	});
	const heardToTheEnd = $derived(furthest >= player.duration - END_SECONDS);

	onMount(() => {
		if (!transcription.firstPartNamed) transcription.nameFirstPart();
	});

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-lg">
		Play the song. Where each part starts, press + Marker and type its name: Intro, Verse, Chorus,
		Fiddle solo…
	</p>

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
			>{clock(player.time)} / {clock(player.duration)}</span
		>
		<SpeedControl {player} />
		<ZoomControl zoom={settings.transcribe.zoom} />
	</div>

	<div>
		<button
			type="button"
			class="big ui-button ui-button-primary"
			onclick={() => transcription.markHere()}
			use:tooltip={TIPS.transcription.markHere}>+ Marker</button
		>
	</div>

	<TranscriptionGrid {transcription} view="markers" />

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
			<span class="text-lg">Every part named?</span>
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.doneNamingSections()}
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
