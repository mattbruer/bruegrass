<!--
	The shown take: its waveform (the trimmed-off parts dimmed), what was
	measured (peak, pitch, length) and what the checks found. Says whether
	it's the kept take or a new one waiting for Keep. A recording of many
	hits shows them numbered on the waveform, to choose from (RunHits).
-->
<script>
	import { drawWaveform } from '../../drawWaveform.js';
	import { formatDb } from '../../takeSummary.js';
	import RunHits from './RunHits.svelte';

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
		const trim = session.run ? null : (shown?.record.analysis.trim ?? null);
		drawWaveform(target, channels, trim);
		const watcher = new ResizeObserver(() => drawWaveform(target, channels, trim));
		watcher.observe(target);
		return () => watcher.disconnect();
	});

	/** Each hit's place along the waveform, as a percentage. */
	const markers = $derived.by(() => {
		const run = session.run;
		const frames = shown?.take.channels[0]?.length ?? 0;
		if (!run || frames === 0) return [];
		return run.hits.map((hit, index) => ({
			left: ((hit.range.start + (hit.analysis.onset ?? 0)) / frames) * 100,
			chosen: run.chosen.includes(index)
		}));
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

<div class="relative">
	<canvas
		bind:this={canvas}
		class="block h-36 w-full ui-well"
		aria-label={shown ? 'The take’s waveform; the dimmed parts are cut off' : 'No take yet'}
	></canvas>
	{#each markers as marker, index (index)}
		<span
			class="marker"
			class:chosen={marker.chosen}
			style:left="{marker.left}%"
			aria-hidden="true"
		>
			{index + 1}
		</span>
	{/each}
</div>

<div class="mt-2 min-h-[4.5rem] text-sm" aria-live="polite">
	{#if session.recording}
		<p class="text-ink-soft">
			Recording… play it as many times as you like, letting each ring, then press R.
		</p>
	{:else if session.run}
		<RunHits {session} />
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
		<p class="text-ink-soft">
			Nothing recorded for this yet. Press R, play it a few times (let each ring), then R again.
		</p>
	{/if}
</div>

<style>
	.marker {
		position: absolute;
		top: 0;
		bottom: 0;
		padding-left: 2px;
		border-left: 1px solid var(--color-ink-soft);
		font-size: 0.65rem;
		line-height: 1;
		color: var(--color-ink-soft);
		pointer-events: none;
	}
	.marker.chosen {
		border-left: 2px solid var(--color-accent);
		color: var(--color-accent);
		font-weight: 700;
	}
</style>
