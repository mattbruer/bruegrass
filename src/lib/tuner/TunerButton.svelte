<script>
	/**
	 * A tuning fork that opens the tuner. Whatever is playing pauses first,
	 * so the microphone hears only you.
	 */
	import { TunerState } from './TunerState.svelte.js';
	import TunerDialog from './TunerDialog.svelte';
	import { pauseAllPlayers } from '$lib/audio/players.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ class?: string }} */
	let { class: className = '' } = $props();

	const tuner = new TunerState();
	let open = $state(false);

	function start() {
		pauseAllPlayers();
		open = true;
		tuner.open();
	}
</script>

<button
	type="button"
	class="tuner-button ui-button {className}"
	class:ui-button-on={open}
	aria-label="Tuner"
	onclick={start}
	use:tooltip={TIPS.tuner.open}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M8 2v8a4 4 0 0 0 8 0V2" />
		<path d="M12 14v8" />
	</svg>
</button>

<TunerDialog bind:open {tuner} />

<style>
	.tuner-button {
		display: grid;
		place-items: center;
	}
	svg {
		width: 1.35rem;
		height: 1.35rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
</style>
