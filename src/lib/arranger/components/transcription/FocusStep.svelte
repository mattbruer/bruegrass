<script>
	/**
	 * Setup's step after choosing a recording: the whole song, or one part of
	 * it (most people want one: a mandolin solo to learn). For one part: play,
	 * press Starts here and Ends here on the lane, and type its name; only
	 * that part is set up from then on.
	 */
	import RecordingStrip from './RecordingStrip.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import { MARKER_NAMES } from '../../transcription/markerNames.js';
	import { formatClock } from '$lib/utils/formatClock.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	const chosen = transcription.focus;
	let onePart = $state(!!chosen);
	let from = $state(/** @type {number | null} */ (chosen?.from ?? null));
	let to = $state(/** @type {number | null} */ (chosen?.to ?? null));
	let name = $state(chosen?.name ?? '');
	let tried = $state(false);

	const missing = $derived(
		from === null
			? 'Press Starts here where the part begins.'
			: to === null || to <= from
				? 'Press Ends here where the part ends.'
				: !name.trim()
					? 'Type the part’s name.'
					: ''
	);

	function usePart() {
		tried = true;
		if (missing || from === null || to === null) return;
		transcription.chooseFocus({ name, from, to });
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-xl">Do you want the whole song, or one part of it?</p>
	<div class="grid gap-3 sm:grid-cols-2">
		<button
			type="button"
			class="choice ui-button"
			onclick={() => transcription.chooseFocus(null)}
			use:tooltip={TIPS.transcription.wholeSong}
		>
			<span class="block text-xl font-bold">The whole song</span>
			<span class="block text-ink-soft">To build an arrangement from it</span>
		</button>
		<button
			type="button"
			class="choice ui-button"
			class:ui-button-on={onePart}
			onclick={() => (onePart = true)}
			use:tooltip={TIPS.transcription.onePart}
		>
			<span class="block text-xl font-bold">One part</span>
			<span class="block text-ink-soft">A solo or a verse, to learn or practise</span>
		</button>
	</div>

	{#if onePart}
		<p class="text-lg">
			Play to the part you want. Press Starts here where it begins and Ends here where it ends, then
			type its name.
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
			<span class="text-lg text-ink-soft tabular-nums"
				>{formatClock(player.time, { tenths: true })} / {formatClock(player.duration)}</span
			>
			<SpeedControl {player} />
		</div>

		<RecordingStrip {transcription} region={{ from, to }} showDownbeat={false} />

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="big ui-button"
				onclick={() => {
					from = player.time;
					if (to !== null && to <= from) to = null;
				}}
				use:tooltip={TIPS.transcription.partFrom}>Starts here</button
			>
			<button
				type="button"
				class="big ui-button"
				onclick={() => {
					to = player.time;
					player.pause();
				}}
				use:tooltip={TIPS.transcription.partTo}>Ends here</button
			>
			<span class="text-ink-soft tabular-nums">
				{from === null ? '' : `From ${formatClock(from, { tenths: true })}`}
				{to === null ? '' : ` to ${formatClock(to, { tenths: true })}`}
			</span>
		</div>

		<label class="flex flex-wrap items-center gap-3">
			<span class="text-lg">Its name</span>
			<input
				class="min-w-0 flex-1 ui-field px-3 py-2 text-lg"
				list="part-names"
				placeholder="Mandolin solo"
				bind:value={name}
			/>
			<datalist id="part-names">
				{#each MARKER_NAMES as each (each)}
					<option value={each}></option>
				{/each}
			</datalist>
		</label>

		{#if tried && missing}
			<p class="text-danger" role="alert">{missing}</p>
		{/if}
		<div class="flex justify-end">
			<button type="button" class="big ui-button ui-button-primary" onclick={usePart}
				>Use this part</button
			>
		</div>
	{/if}
</div>

<style>
	.choice {
		padding: 1rem 1.25rem;
		text-align: left;
	}

	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
