<script>
	/**
	 * How much the notes vary (instruments/roundRobin.js), for finding by ear
	 * where it's too little and too much. The readout gives the real amounts.
	 */
	import Slider from '../mixer/Slider.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { LEVEL_DB, pitchCents } from '../../instruments/roundRobin.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const MAX_AMOUNT = 5;

	/** @param {number} amount */
	const format = (amount) =>
		`±${Math.round(pitchCents(amount))}¢ ±${(LEVEL_DB * amount).toFixed(1)} dB`;
</script>

<div class="amount" class:off={!settings.varyNotes}>
	<Slider
		bind:value={settings.varyAmount}
		toPosition={(amount) => amount / MAX_AMOUNT}
		fromPosition={(position) => Math.round(position * MAX_AMOUNT * 10) / 10}
		{format}
		reset={1}
		label="How much notes vary"
		name="Amount"
		tip={TIPS.player.varyAmount}
	/>
</div>

<style>
	.amount {
		--slider-length: 7rem;
	}

	.off {
		opacity: 0.5;
	}
</style>
