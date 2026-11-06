<script>
	/**
	 * Record a test take and check it: its waveform (one lane per mic), how
	 * long it is and how loud it peaked, a listen, and a WAV to open in
	 * Logic. R records and stops; Space plays and stops.
	 */
	import { onMount } from 'svelte';
	import { encodeWav } from '$lib/arranger/export/wav.js';
	import { downloadFile } from '$lib/utils/downloadFile.js';
	import { drawWaveform } from '../drawWaveform.js';
	import { listenForShortcuts, SHORTCUTS } from '../keyboardShortcuts.js';
	import { formatDb, summariseTake } from '../takeSummary.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ input: import('../InputCheck.svelte.js').InputCheck }} */
	let { input } = $props();

	const recording = $derived(input.status === 'recording');
	const summary = $derived(input.take ? summariseTake(input.take) : null);

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	// Redraw when there's a new take, and when the canvas changes size
	$effect(() => {
		if (!canvas) return;
		const target = canvas;
		const channels = input.take?.channels ?? [];
		drawWaveform(target, channels);
		const watcher = new ResizeObserver(() => drawWaveform(target, channels));
		watcher.observe(target);
		return () => watcher.disconnect();
	});

	onMount(() =>
		listenForShortcuts({
			record: () => input.toggleRecording(),
			play: () => input.togglePlaying()
		})
	);

	function download() {
		if (!input.take) return;
		const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
		downloadFile(
			encodeWav(input.take.channels, input.take.sampleRate),
			`test-take-${stamp}.wav`,
			'audio/wav'
		);
		input.takeDownloaded = true;
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<button
		type="button"
		class="ui-button px-4 py-2"
		class:ui-button-on={recording}
		disabled={input.status !== 'on' && !recording}
		onclick={() => input.toggleRecording()}
		use:tooltip={TIPS.sampler.record}
	>
		<span class="record-dot" class:live={recording} aria-hidden="true"></span>
		{recording ? 'Stop' : 'Record'}
		<kbd>{SHORTCUTS.record.label}</kbd>
	</button>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!input.take || recording}
		onclick={() => input.togglePlaying()}
		use:tooltip={TIPS.sampler.play}
	>
		{input.playing ? 'Stop' : 'Play'}
		<kbd>{SHORTCUTS.play.label}</kbd>
	</button>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!input.take || recording}
		onclick={download}
		use:tooltip={TIPS.sampler.download}
	>
		Download WAV
	</button>
</div>

<canvas
	bind:this={canvas}
	class="mt-4 block h-40 w-full ui-well"
	aria-label={summary ? 'The take’s waveform' : 'No take yet'}
></canvas>

<p class="mt-2 text-sm text-ink-soft" aria-live="polite">
	{#if recording}
		Recording…
	{:else if summary}
		{summary.seconds.toFixed(1)} s. Peak: {summary.peaksDb
			.map((db, index) => `input ${index + 1} ${formatDb(db)}`)
			.join(', ')}.
		{#if input.hasUnsavedTake}Not saved: download it to keep it.{/if}
	{:else}
		No take yet. Turn the input on, then press Record.
	{/if}
</p>

<style>
	kbd {
		margin-left: 0.4rem;
		padding: 0 0.3rem;
		border-radius: var(--corner-control);
		box-shadow: var(--shadow-inset-small);
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-ink-soft);
	}

	.record-dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.35rem;
		border-radius: 50%;
		background: var(--color-ink-faint);
		vertical-align: 0.05em;
	}

	.record-dot.live {
		background: var(--meter-clip);
	}
</style>
