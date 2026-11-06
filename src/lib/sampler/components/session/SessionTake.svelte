<!--
	The shown take: its waveform (the trimmed-off parts dimmed), what was
	measured (peak, pitch, length) and what the checks found. Says whether
	it's the kept take or a new one waiting for Keep.
-->
<script>
	import { drawWaveform } from '../../drawWaveform.js';
	import { formatDb } from '../../takeSummary.js';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const shown = $derived(session.shown);
	const analysis = $derived(shown?.record.analysis ?? null);
	const problems = $derived(session.problems);

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	// Redraw for each take, and when the canvas changes size
	$effect(() => {
		if (!canvas) return;
		const target = canvas;
		const channels = shown?.take.channels ?? [];
		const trim = shown?.record.analysis.trim ?? null;
		drawWaveform(target, channels, trim);
		const watcher = new ResizeObserver(() => drawWaveform(target, channels, trim));
		watcher.observe(target);
		return () => watcher.disconnect();
	});

	const seconds = $derived(
		analysis && shown ? (analysis.trim.end - analysis.trim.start) / shown.record.sampleRate : 0
	);

	/** @param {number} cents */
	const formatCents = (cents) =>
		Math.abs(cents) < 0.5
			? 'in tune'
			: `${cents > 0 ? '+' : '−'}${Math.abs(cents).toFixed(0)} cents`;
</script>

<canvas
	bind:this={canvas}
	class="block h-36 w-full ui-well"
	aria-label={shown ? 'The take’s waveform; the dimmed parts are cut off' : 'No take yet'}
></canvas>

<div class="mt-2 min-h-[4.5rem] text-sm" aria-live="polite">
	{#if session.recording}
		<p class="text-ink-soft">Recording… play the note, let it ring, then press R.</p>
	{:else if shown && analysis}
		<p class="text-ink-soft">
			<span class="font-semibold text-ink"
				>{shown.record.kept ? 'Kept take.' : 'New take, not kept yet.'}</span
			>
			Sample {seconds.toFixed(2)} s · peak {formatDb(analysis.peakDb)}
			{#if analysis.cents !== null}· {formatCents(analysis.cents)}{/if}
		</p>
		{#if problems.length === 0}
			<p class="mt-1 text-ink-soft">Checks passed.</p>
		{:else}
			<ul class="mt-1 space-y-0.5">
				{#each problems as problem (problem.text)}
					<li class:text-danger={problem.severity === 'redo'}>
						{problem.severity === 'redo' ? 'Redo:' : 'Listen:'}
						{problem.text}
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="text-ink-soft">Nothing recorded for this yet. Press R, play, then R again.</p>
	{/if}
</div>
