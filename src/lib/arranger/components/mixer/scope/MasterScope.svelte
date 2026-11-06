<script>
	/**
	 * The master visualiser: what's coming out of the master fader, as a
	 * waveform, a spectrum, or a stereo picture (with a correlation reading:
	 * +1 mono, 0 wide, below 0 the speakers cancel out).
	 *
	 * It redraws every frame from the master tap (see analysis/taps.js), and
	 * stays blank until the audio exists (the first Play).
	 */
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { audioTaps } from '../../../playback/mixerGraph.svelte.js';
	import { onEveryFrame } from '../../../playback/analysis/frameLoop.js';
	import { stereoCorrelation } from '../../../playback/analysis/levels.js';
	import { prepareCanvas, themeColours } from './canvas.js';
	import { drawWaveform } from './drawWaveform.js';
	import { drawSpectrum } from './drawSpectrum.js';
	import { drawStereoField } from './drawStereoField.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const VIEWS = /** @type {const} */ ([
		{ id: 'waveform', name: 'Wave' },
		{ id: 'spectrum', name: 'Spectrum' },
		{ id: 'stereo', name: 'Stereo' }
	]);
	/** How often the correlation number updates (it's unreadable at 60 a second). */
	const CORRELATION_UPDATE_SECONDS = 0.25;

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	let correlation = $state(0);

	/** Theme colours, re-read when the appearance settings change. */
	let colours = $derived.by(() => {
		JSON.stringify(settings.appearance); // follow theme changes
		return canvas ? themeColours(canvas) : null;
	});

	onMount(() => {
		let sinceCorrelation = 0;

		return onEveryFrame((_now, elapsed) => {
			const taps = audioTaps.current;
			if (!canvas || !colours) return;
			const { context, width, height } = prepareCanvas(canvas);
			if (!taps) return;

			if (settings.scopeView === 'spectrum') {
				const spectrum = taps.spectrum;
				drawSpectrum(context, spectrum.read(), spectrum.sampleRate, width, height, colours);
				return;
			}

			const samples = taps.master.read();
			if (settings.scopeView === 'waveform') {
				drawWaveform(context, samples, width, height, colours);
				return;
			}

			drawStereoField(context, samples, width, height, colours);
			sinceCorrelation += elapsed;
			if (sinceCorrelation >= CORRELATION_UPDATE_SECONDS) {
				correlation = stereoCorrelation(samples.left, samples.right);
				sinceCorrelation = 0;
			}
		});
	});
</script>

<section class="scope" aria-label="Master visualiser">
	<h3 class="text-center text-[0.7rem] font-extrabold tracking-wider uppercase">Output</h3>

	<canvas bind:this={canvas} class="screen" aria-hidden="true"></canvas>

	<div class="flex ui-well rounded-[var(--corner-control)] p-0.5" role="group" aria-label="View">
		{#each VIEWS as view (view.id)}
			{@const chosen = settings.scopeView === view.id}
			<button
				type="button"
				class="flex-1 rounded-[var(--corner-control)] py-0.5 text-[0.65rem] font-semibold"
				class:ui-button={chosen}
				class:text-accent={chosen}
				class:text-ink-soft={!chosen}
				aria-pressed={chosen}
				onclick={() => (settings.scopeView = view.id)}
				use:tooltip={TIPS.mixer.scopeView[view.id]}
			>
				{view.name}
			</button>
		{/each}
	</div>

	{#if settings.scopeView === 'stereo'}
		<p class="text-center font-mono text-xs text-ink-soft">
			correlation {correlation >= 0 ? '+' : ''}{correlation.toFixed(2)}
		</p>
	{/if}
</section>

<style>
	/*
	 * A small screen beside the master strip: a fixed size (it doesn't
	 * grow to fill the tray), sitting at the top of the console.
	 */
	.scope {
		display: flex;
		flex: 0 0 var(--scope-width);
		align-self: flex-start;
		flex-direction: column;
		gap: 0.6rem;
		border-radius: var(--corner-card);
		background: var(--mixer-strip);
		padding: 0.85rem;
		box-shadow: var(--shadow-raised-small);
		--color-surface: var(--mixer-strip);
		/* The visualiser's size: change these two to make it bigger or smaller */
		--scope-width: 12rem;
		--scope-screen-height: 6rem;
	}

	.screen {
		width: 100%;
		height: var(--scope-screen-height);
		border-radius: var(--corner-small);
		background: var(--mixer-tray);
		box-shadow: var(--shadow-inset-small);
	}
</style>
