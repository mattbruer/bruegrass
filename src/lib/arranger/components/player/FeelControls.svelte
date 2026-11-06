<script>
	/** The strumming hand's feel (instruments/hand.js): on/off and how much, to A/B while playing. */
	import Slider from '../mixer/Slider.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const MAX_AMOUNT = 3;
</script>

<button
	type="button"
	class="ui-button px-4 py-2"
	class:ui-button-on={settings.feelOn}
	aria-pressed={settings.feelOn}
	onclick={() => (settings.feelOn = !settings.feelOn)}
	use:tooltip={TIPS.player.feelOn}
>
	Feel
</button>
<div class="amount" class:off={!settings.feelOn}>
	<Slider
		bind:value={settings.feelAmount}
		toPosition={(amount) => amount / MAX_AMOUNT}
		fromPosition={(position) => Math.round(position * MAX_AMOUNT * 10) / 10}
		format={(amount) => `×${amount.toFixed(1)}`}
		reset={1}
		label="How much feel"
		name="Amount"
		tip={TIPS.player.feelAmount}
	/>
</div>

<style>
	.amount {
		--slider-length: 6rem;
	}

	.off {
		opacity: 0.5;
	}
</style>
