<script>
	/**
	 * How hard the limiter is working: a bar that grows from the right as it
	 * turns the sound down, with the amount in dB. At the loudness target it
	 * should barely flicker on the loudest notes; a bar that's often long
	 * means the output gain is pushing it, and the sound is being squashed.
	 * The bar is drawn each frame, like the level meters; the number updates
	 * ten times a second, which is as fast as it can be read.
	 */
	import { onMount } from 'svelte';
	import { audioTaps } from '../../../playback/mixerGraph.svelte.js';
	import { onEveryFrame } from '../../../playback/analysis/frameLoop.js';
	import { formatReduction } from './formatReadings.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** The bar's full length, in dB of gain reduction. */
	const FULL_SCALE_DB = 6;
	/** After the limiter lets go, the bar falls back over about this long (so a flicker is visible). */
	const FALL_SECONDS = 0.3;

	/** @type {HTMLElement | undefined} */
	let bar = $state();
	let amount = $state('0.0');
	/** How often the number updates. */
	const NUMBER_UPDATE_SECONDS = 0.1;

	onMount(() => {
		let shown = 0;
		let sinceNumber = 0;
		return onEveryFrame((_now, elapsed) => {
			const reduction = -(audioTaps.current?.output.read().gainReductionDb ?? 0);
			shown =
				reduction > shown
					? reduction
					: Math.max(reduction, shown - (FULL_SCALE_DB * elapsed) / FALL_SECONDS);
			bar?.style.setProperty('--reduction', String(Math.min(1, shown / FULL_SCALE_DB)));
			sinceNumber += elapsed;
			if (sinceNumber >= NUMBER_UPDATE_SECONDS) {
				sinceNumber = 0;
				amount = formatReduction(-shown);
			}
		});
	});
</script>

<div class="limiter" aria-label="Limiter gain reduction" use:tooltip={TIPS.loudness.limiter}>
	<div class="caption">
		<span>Limiter</span>
		<span class="amount">{amount}</span>
	</div>
	<div class="track ui-well"><div class="bar" bind:this={bar}></div></div>
</div>

<style>
	.limiter {
		width: 100%;
		font-size: 0.65rem;
	}

	.caption {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.2rem;
		color: var(--color-ink-soft);
	}

	.amount {
		font-family: ui-monospace, monospace;
		color: var(--color-ink);
	}

	.track {
		position: relative;
		height: 0.4rem;
		overflow: hidden;
	}

	/* Grows from the right: gain reduction is a turning-down */
	.bar {
		position: absolute;
		inset-block: 0;
		right: 0;
		width: calc(var(--reduction, 0) * 100%);
		background: var(--meter-hot);
	}
</style>
