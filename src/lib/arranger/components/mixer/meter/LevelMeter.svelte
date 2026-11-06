<script>
	/**
	 * A stereo level meter: a bar for each side, beside a fader. It uses the
	 * fader's own dB scale, so the meter's 0 lines up with the fader's 0.
	 *
	 * Each bar shows the peak level (jumping up, falling back smoothly), with
	 * a peak-hold mark above it. Reaching full scale lights the top red until
	 * you tap the meter.
	 */
	import { onMount } from 'svelte';
	import { dbToFader, FADER_MIN } from '../../../playback/faderTaper.js';
	import { peakLevel, toDecibels } from '../../../playback/analysis/levels.js';
	import { createMeterBallistics } from '../../../playback/analysis/meterBallistics.js';
	import { onEveryFrame } from '../../../playback/analysis/frameLoop.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/* Where the colours change, in dB */
	const HOT_FROM_DB = -12;
	const CLIP_AT_DB = 0;

	/**
	 * @type {{ tap: import('../../../playback/analysis/taps.js').StereoTap | null }}
	 *   tap: what to measure (null before the audio exists: the meter stays empty)
	 */
	let { tap } = $props();

	const SIDES = ['left', 'right'];
	const ballistics = SIDES.map(() => createMeterBallistics(FADER_MIN));
	/** @type {HTMLElement[]} */
	const bars = [];
	let clipped = $state(false);

	/** The colour ramp, placed at the dB scale's positions so the colours mean the same everywhere. */
	const colourRamp = `linear-gradient(to top,
		var(--meter-safe) 0%,
		var(--meter-safe) ${dbToFader(HOT_FROM_DB) * 100}%,
		var(--meter-hot) ${dbToFader(HOT_FROM_DB) * 100}%,
		var(--meter-hot) ${dbToFader(CLIP_AT_DB) * 100}%,
		var(--meter-clip) ${dbToFader(CLIP_AT_DB) * 100}%)`;

	onMount(() =>
		onEveryFrame((now, elapsed) => {
			const samples = tap?.read();
			const levels = samples ? [samples.left, samples.right] : [null, null];

			levels.forEach((side, index) => {
				const levelDb = side ? toDecibels(peakLevel(side)) : -Infinity;
				const reading = ballistics[index].update(levelDb, now, elapsed);
				bars[index]?.style.setProperty('--level', String(dbToFader(reading.shownDb)));
				bars[index]?.style.setProperty('--hold', String(dbToFader(reading.holdDb)));
				if (reading.clipped) clipped = true;
			});
		})
	);

	function clearClip() {
		for (const meter of ballistics) meter.clearClip();
		clipped = false;
	}
</script>

<button
	type="button"
	class="meter"
	class:clipped
	use:tooltip={TIPS.mixer.meter}
	aria-label={clipped ? 'Clipped. Tap to clear.' : 'Level meter'}
	onclick={clearClip}
	style:--ramp={colourRamp}
>
	{#each SIDES as side, index (side)}
		<span class="bar {side}" bind:this={bars[index]}>
			<span class="fill"></span>
			<span class="hold"></span>
		</span>
	{/each}
</button>

<style>
	/* Two thin bars, spanning the same height as the fader's travel */
	.meter {
		--cap: 1.1rem; /* the fader cap's height: the scale starts half a cap in */
		position: relative;
		display: flex;
		gap: 2px;
		padding-block: calc(var(--cap) / 2);
		cursor: pointer;
	}

	.bar {
		position: relative;
		width: 0.3rem;
		border-radius: 1px;
		background: var(--mixer-tray);
		box-shadow: var(--shadow-inset-small);
		overflow: hidden;
		--level: 0;
		--hold: 0;
	}

	/* The ramp covers the whole bar; only the part up to the level shows */
	.fill {
		position: absolute;
		inset: 0;
		background: var(--ramp);
		clip-path: inset(calc((1 - var(--level)) * 100%) 0 0 0);
	}

	.hold {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(var(--hold) * 100%);
		height: 2px;
		background: var(--color-ink-soft);
	}

	/* Clipped: the top of each bar stays red until tapped */
	.clipped .bar {
		border-top: 3px solid var(--meter-clip);
	}

	.meter:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
