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
	import KeyHint from './KeyHint.svelte';
	import RecordButton from './RecordButton.svelte';

	/** @type {{ test: import('../TestTake.svelte.js').TestTake }} */
	let { test } = $props();

	const input = $derived(test.input);
	const recording = $derived(input.status === 'recording');
	const summary = $derived(test.take ? summariseTake(test.take) : null);

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	// Redraw when there's a new take, and when the canvas changes size
	$effect(() => {
		if (!canvas) return;
		const target = canvas;
		const channels = test.take?.channels ?? [];
		drawWaveform(target, channels);
		const watcher = new ResizeObserver(() => drawWaveform(target, channels));
		watcher.observe(target);
		return () => watcher.disconnect();
	});

	onMount(() =>
		listenForShortcuts({
			record: () => test.toggleRecording(),
			play: () => test.togglePlaying()
		})
	);

	function download() {
		if (!test.take) return;
		const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
		downloadFile(
			encodeWav(test.take.channels, test.take.sampleRate),
			`test-take-${stamp}.wav`,
			'audio/wav'
		);
		test.downloaded = true;
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<RecordButton
		{recording}
		disabled={input.status !== 'on' && !recording}
		tip={TIPS.sampler.record}
		onclick={() => test.toggleRecording()}
	/>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!test.take || recording}
		onclick={() => test.togglePlaying()}
		use:tooltip={TIPS.sampler.play}
	>
		{test.playing ? 'Stop' : 'Play'}
		<KeyHint label={SHORTCUTS.play.label} />
	</button>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!test.take || recording}
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
		{#if test.unsaved}Not saved: download it to keep it.{/if}
	{:else}
		No take yet. Turn the input on, then press Record.
	{/if}
</p>
