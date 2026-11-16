<script>
	/**
	 * Setup's last step: mark the parts while the recording plays. One big
	 * button marks where a part starts (at the nearest bar line); it pauses
	 * and asks what part it is, with big choices, then plays on. Another ends
	 * a part with nothing after it. The parts marked so far are listed with
	 * their bars, each with a way to hear it and to take it away.
	 */
	import { PART_NAMES } from '../../transcription/setupSteps.js';
	import { MARKER_NAMES } from '../../transcription/markerNames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	let typing = $state(false);
	let typed = $state('');

	/** @param {string} name */
	function choose(name) {
		typing = false;
		typed = '';
		transcription.namePart(name);
	}

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

{#if transcription.askingPartAt !== null}
	<div class="flex flex-col gap-4" role="group" aria-labelledby="part-question">
		<h3 id="part-question" class="text-2xl font-bold">What part is this?</h3>
		<p class="text-ink-soft">Starting at bar {transcription.askingPartAt}</p>
		<div class="flex flex-wrap gap-3">
			{#each PART_NAMES as name (name)}
				<button type="button" class="big ui-button" onclick={() => choose(name)}>{name}</button>
			{/each}
			<button
				type="button"
				class="big ui-button"
				class:ui-button-on={typing}
				onclick={() => (typing = true)}>Something else…</button
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
					placeholder="Mandolin solo"
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
		<div>
			<button
				type="button"
				class="ui-button px-4 py-2"
				onclick={() => transcription.cancelPart()}
				use:tooltip={TIPS.transcription.notAPart}>Not a part, play on</button
			>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-5">
		<p class="text-lg">Play the song. When a part you want begins, tap A part starts here.</p>
		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="big ui-button"
				onclick={() => (player.playing ? player.pause() : player.play())}
			>
				{player.playing ? '❚❚ Pause' : '▶ Play'}
			</button>
			<span class="text-lg text-ink-soft tabular-nums">{clock(player.time)}</span>
		</div>

		<div class="flex flex-wrap gap-3">
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.startPartHere()}
				use:tooltip={TIPS.transcription.partStarts}>A part starts here</button
			>
			{#if transcription.sections.length > 0}
				<button
					type="button"
					class="big ui-button"
					onclick={() => transcription.endPartHere()}
					use:tooltip={TIPS.transcription.partEnds}>That part ends here</button
				>
			{/if}
		</div>

		{#if transcription.sections.length > 0}
			<ul class="flex flex-col divide-y divide-line ui-well">
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
								use:tooltip={TIPS.transcription.hearPart}>▶ Hear it</button
							>
							<button
								type="button"
								class="ui-button px-3 py-1.5"
								onclick={() => transcription.setMarker(section.from, '')}
								aria-label="Remove {section.name}"
								use:tooltip={TIPS.transcription.removePart}>✕</button
							>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
