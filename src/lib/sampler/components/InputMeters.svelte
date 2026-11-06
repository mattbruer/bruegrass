<script>
	/**
	 * A level meter for each input channel (each mic), side to side, with
	 * the peak in dB. For setting the interface's gain before recording:
	 * the hardest hits should reach the amber, never the red.
	 */
	import { onMount } from 'svelte';
	import { peakLevel, toDecibels } from '$lib/arranger/playback/analysis/levels.js';
	import { createMeterBallistics } from '$lib/arranger/playback/analysis/meterBallistics.js';
	import { onEveryFrame } from '$lib/arranger/playback/analysis/frameLoop.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/* The meter's scale and where its colours change, in dB */
	const FLOOR_DB = -60;
	const HOT_FROM_DB = -12;
	const CLIP_AT_DB = 0;

	/**
	 * @type {{ channelCount: number, read: () => Float32Array[] }}
	 *   read: the latest samples of each channel
	 */
	let { channelCount, read } = $props();

	/** @param {number} db 0 at the floor, 1 at full scale */
	const toPosition = (db) => Math.min(1, Math.max(0, (db - FLOOR_DB) / -FLOOR_DB));

	const channels = $derived(Array.from({ length: channelCount }, (_, index) => index));
	/** @type {ReturnType<typeof createMeterBallistics>[]} */
	let ballistics = [];
	$effect(() => {
		ballistics = channels.map(() => createMeterBallistics(FLOOR_DB));
	});

	/** @type {HTMLElement[]} */
	const bars = [];
	/** @type {HTMLElement[]} */
	const readouts = [];
	/** @type {boolean[]} */
	let clipped = $state([]);

	onMount(() =>
		onEveryFrame((now, elapsed) => {
			read().forEach((samples, index) => {
				const meter = ballistics[index];
				if (!meter) return;
				const reading = meter.update(toDecibels(peakLevel(samples)), now, elapsed);
				bars[index]?.style.setProperty('--level', String(toPosition(reading.shownDb)));
				bars[index]?.style.setProperty('--hold', String(toPosition(reading.holdDb)));
				if (readouts[index]) {
					readouts[index].textContent =
						reading.holdDb > FLOOR_DB ? reading.holdDb.toFixed(1) : '–∞';
				}
				if (reading.clipped && !clipped[index]) clipped[index] = true;
			});
		})
	);

	/** @param {number} index */
	function clearClip(index) {
		ballistics[index]?.clearClip();
		clipped[index] = false;
	}

	const colourRamp = `linear-gradient(to right,
		var(--meter-safe) 0%,
		var(--meter-safe) ${toPosition(HOT_FROM_DB) * 100}%,
		var(--meter-hot) ${toPosition(HOT_FROM_DB) * 100}%,
		var(--meter-hot) ${toPosition(CLIP_AT_DB) * 100 - 1}%,
		var(--meter-clip) ${toPosition(CLIP_AT_DB) * 100 - 1}%)`;
</script>

<div class="flex flex-col gap-2" style:--ramp={colourRamp}>
	{#each channels as index (index)}
		<button
			type="button"
			class="meter-row"
			class:clipped={clipped[index]}
			aria-label={clipped[index]
				? `Input ${index + 1} clipped. Click to clear.`
				: `Input ${index + 1} level`}
			onclick={() => clearClip(index)}
			use:tooltip={TIPS.sampler.meter}
		>
			<span class="w-14 shrink-0 text-left text-xs font-semibold">Input {index + 1}</span>
			<span class="bar ui-well" bind:this={bars[index]}>
				<span class="fill"></span>
				<span class="hold"></span>
			</span>
			<span class="w-12 shrink-0 text-right text-xs tabular-nums" bind:this={readouts[index]}
				>–∞</span
			>
		</button>
	{/each}
</div>

<style>
	.meter-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		color: var(--color-ink-soft);
	}

	.bar {
		position: relative;
		flex: 1;
		height: 0.9rem;
		overflow: hidden;
		border-radius: var(--corner-control);
	}

	/* The colour ramp stays put; the fill only reveals more of it */
	.fill {
		position: absolute;
		inset: 0;
		background: var(--ramp);
		clip-path: inset(0 calc((1 - var(--level, 0)) * 100%) 0 0);
	}

	.hold {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--hold, 0) * 100%);
		width: 2px;
		background: var(--color-ink);
	}

	.clipped .bar {
		outline: 2px solid var(--meter-clip);
	}
</style>
