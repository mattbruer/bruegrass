<script>
	/**
	 * How fast the recording plays (the pitch stays): a slider named by a
	 * small caption under it (the clock's look, so it fits a narrow bar), and
	 * its % readout, which goes back to full speed when tapped.
	 */
	import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '$lib/slowDowner/speed.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ player: import('$lib/slowDowner/StretchPlayer.svelte.js').StretchPlayer }} */
	let { player } = $props();
</script>

<label class="flex items-center gap-2">
	<span class="flex flex-col items-center gap-1.5">
		<input
			type="range"
			min={MIN_SPEED}
			max={MAX_SPEED}
			step={SPEED_STEP}
			value={player.speed}
			oninput={(event) => player.setSpeed(Number(event.currentTarget.value))}
			class="w-28"
			use:tooltip={TIPS.transcription.speed}
		/>
		<span class="caption">Speed</span>
	</span>
	<button
		type="button"
		class="h-10 w-16 ui-button tabular-nums"
		onclick={() => player.setSpeed(1)}
		use:tooltip={TIPS.transcription.resetSpeed}>{Math.round(player.speed * 100)}%</button
	>
</label>

<style>
	.caption {
		font-size: 0.6rem;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
