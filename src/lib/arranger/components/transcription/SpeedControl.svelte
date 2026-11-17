<script>
	/**
	 * How fast the recording plays (the pitch stays): a slider, and its %
	 * readout, which goes back to full speed when tapped.
	 */
	import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '$lib/slowDowner/speed.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ player: import('$lib/slowDowner/StretchPlayer.svelte.js').StretchPlayer }} */
	let { player } = $props();
</script>

<label class="flex items-center gap-2">
	<span class="text-sm text-ink-soft">Speed</span>
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
	<button
		type="button"
		class="w-14 ui-button px-2 py-1 text-sm tabular-nums"
		onclick={() => player.setSpeed(1)}
		use:tooltip={TIPS.transcription.resetSpeed}>{Math.round(player.speed * 100)}%</button
	>
</label>
