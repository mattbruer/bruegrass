<script>
	/** A strip's main fader, with its dB scale and level meter beside it. */
	import Slider from './Slider.svelte';
	import LevelMeter from './meter/LevelMeter.svelte';
	import { dbToFader } from '../../playback/faderTaper.js';
	import { LEVEL_SCALE } from './controlScales.js';

	/** Numbered marks beside the fader. */
	const SCALE_MARKS = [
		{ db: 6, text: '+6' },
		{ db: 0, text: '0' },
		{ db: -10, text: '10' },
		{ db: -20, text: '20' },
		{ db: -30, text: '30' },
		{ db: -40, text: '40' },
		{ db: -Infinity, text: '∞' }
	];
	/** Small unnumbered ticks between them (every 5 dB, plus +3). */
	const MINOR_TICKS = [3, -5, -15, -25, -35, -50];

	/**
	 * @type {{
	 *   level: { volume: number },
	 *   reset: number,
	 *   label: string,
	 *   meter: import('../../playback/analysis/taps.js').StereoTap | null,
	 *   variant?: string,
	 *   tip?: string
	 * }}
	 *   reset: where a reset puts the fader (its default), in dB
	 *   meter: what the level meter measures (null until the audio exists)
	 */
	let { level, reset, label, meter, variant = '', tip } = $props();
</script>

{#snippet scaleAndMeter()}
	<div class="scale" aria-hidden="true">
		{#each MINOR_TICKS as db (db)}
			<span class="tick minor" style="--at: {dbToFader(db)}"></span>
		{/each}
		{#each SCALE_MARKS as mark (mark.text)}
			<span class="tick" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}"></span>
			<span class="number" class:unity={mark.db === 0} style="--at: {dbToFader(mark.db)}"
				>{mark.text}</span
			>
		{/each}
	</div>
	<LevelMeter tap={meter} />
{/snippet}

<Slider
	bind:value={level.volume}
	{...LEVEL_SCALE}
	{reset}
	label="{label} fader"
	orientation="vertical"
	{variant}
	{tip}
	children={scaleAndMeter}
/>

<style>
	/* Ticks line up with the centre of the fader cap at each level */
	.scale {
		--cap: 1.1rem; /* the fader cap's height (Slider.svelte) */
		position: relative;
		width: 1.75rem;
	}

	.tick,
	.number {
		position: absolute;
		top: calc(var(--cap) / 2 + (1 - var(--at)) * (100% - var(--cap)));
		transform: translateY(-50%);
	}

	.tick {
		left: 0;
		width: 0.45rem;
		height: 1px;
		background: var(--color-ink-faint);
	}

	.tick.minor {
		width: 0.25rem;
		opacity: 0.6;
	}

	.tick.unity {
		width: 0.55rem;
		height: 2px;
		background: var(--color-accent);
	}

	.number {
		left: 0.6rem;
		font-family: ui-monospace, monospace;
		font-size: 0.6rem;
		line-height: 1;
		color: var(--color-ink-faint);
	}

	.number.unity {
		font-weight: 700;
		color: var(--color-accent);
	}
</style>
