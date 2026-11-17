<script>
	/**
	 * Setup's last step: name every part of the song, start to end. First it
	 * asks what the song starts with; then, while it plays, one big button
	 * says a new part starts here (at the nearest bar line): it pauses, asks
	 * which part, and plays on. Each part lasts until the next one. Done
	 * shows once the song has been played to the end (or every part was
	 * named before), so no part is left without a name.
	 */
	import { PART_NAMES } from '../../transcription/setupSteps.js';
	import { MARKER_NAMES } from '../../transcription/markerNames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** Within this much of the end counts as having played to the end. */
	const END_SECONDS = 3;

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	let typing = $state(false);
	let typed = $state('');

	// Named before (coming back to fix them): no need to play it all again
	let furthest = $state(transcription.sections.length > 1 ? Infinity : 0);
	$effect(() => {
		if (player.time > furthest) furthest = player.time;
	});
	const heardToTheEnd = $derived(furthest >= player.duration - END_SECONDS);

	const asking = $derived(!transcription.firstPartNamed || transcription.askingPartAt !== null);

	/** @param {string} name */
	function choose(name) {
		typing = false;
		typed = '';
		if (!transcription.firstPartNamed) transcription.nameFirstPart(name);
		else transcription.namePart(name);
	}

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

{#if asking}
	<div class="flex flex-col gap-4" role="group" aria-labelledby="part-question">
		<h3 id="part-question" class="text-2xl font-bold">
			{transcription.firstPartNamed ? 'What part just started?' : 'What does the song start with?'}
		</h3>
		<div class="flex flex-wrap gap-3">
			{#each PART_NAMES as name (name)}
				<button type="button" class="big ui-button" onclick={() => choose(name)}>{name}</button>
			{/each}
			<button
				type="button"
				class="big ui-button"
				class:ui-button-on={typing}
				onclick={() => (typing = true)}>Other…</button
			>
		</div>
		{#if typing}
			<form
				class="flex flex-wrap gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					choose(typed);
				}}
			>
				<!-- svelte-ignore a11y_autofocus (the field was just asked for) -->
				<input
					class="min-w-0 flex-1 ui-field px-3 py-2 text-lg"
					list="part-names"
					placeholder="Fiddle solo"
					aria-label="The part's name"
					bind:value={typed}
					autofocus
				/>
				<datalist id="part-names">
					{#each MARKER_NAMES as name (name)}
						<option value={name}></option>
					{/each}
				</datalist>
				<button type="submit" class="ui-button px-5 py-2 ui-button-primary" disabled={!typed.trim()}
					>OK</button
				>
			</form>
		{/if}
		{#if transcription.askingPartAt !== null}
			<div>
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => transcription.cancelPart()}
					use:tooltip={TIPS.transcription.notAPart}>Oops, no new part</button
				>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex flex-col gap-5">
		<p class="text-xl">Play the song. When a new part starts, press the big button.</p>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="big ui-button"
				onclick={() => (player.playing ? player.pause() : player.play())}
			>
				{player.playing ? '❚❚ Pause' : '▶ Play'}
			</button>
			<span class="text-lg text-ink-soft tabular-nums"
				>{clock(player.time)} / {clock(player.duration)}</span
			>
		</div>

		<div>
			<button
				type="button"
				class="huge ui-button ui-button-primary"
				onclick={() => transcription.startPartHere()}
				use:tooltip={TIPS.transcription.partStarts}>A new part starts</button
			>
		</div>

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

		<div class="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
			{#if heardToTheEnd}
				<span class="text-lg">Every part named?</span>
				<button
					type="button"
					class="big ui-button ui-button-primary"
					onclick={() => transcription.doneNamingSections()}
					use:tooltip={TIPS.transcription.doneNaming}>Done</button
				>
			{:else}
				<span class="text-lg text-ink-soft">Keep going to the end of the song.</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.huge {
		min-height: 5rem;
		padding: 1rem 2.5rem;
		font-size: 1.5rem;
		font-weight: 700;
	}
</style>
