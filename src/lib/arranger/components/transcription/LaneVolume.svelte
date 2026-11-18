<script>
	/** A lane's volume: a small fader across, on the console's taper. */
	import Slider from '../mixer/Slider.svelte';
	import { LEVEL_SCALE } from '../mixer/controlScales.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ level: { volume: number }, name: string }} */
	let { level, name } = $props();
</script>

<div class="lane-volume">
	<Slider
		bind:value={level.volume}
		{...LEVEL_SCALE}
		reset={0}
		label="{name} volume"
		showValue={false}
		tip={TIPS.transcription.laneVolume}
	/>
</div>

<style>
	.lane-volume {
		flex-basis: 100%;
		--slider-length: calc(var(--header-width) - 2 * var(--header-padding) - 0.4rem);
	}
</style>
