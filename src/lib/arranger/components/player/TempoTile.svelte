<script>
	/**
	 * The tempo on the player bar, always in view (TempoStepper). The ⋯ key
	 * opens the panel for the swing and the click's sound and level.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import TempoStepper from './TempoStepper.svelte';
	import TempoPanel from './TempoPanel.svelte';

	const PANEL_ID = 'tempo-panel';
</script>

<span class="bar-tile wide">
	<TempoStepper />
	<button type="button" class="more" popovertarget={PANEL_ID} use:tooltip={TIPS.player.tempoMore}>
		<span aria-hidden="true">⋯</span><span class="sr-only">Swing and click sound</span>
	</button>
</span>
<TempoPanel id={PANEL_ID} />

<style>
	.more {
		display: grid;
		place-items: center;
		height: 2.75rem;
		width: 2rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-ink);
		background: transparent;
		border: none;
		border-radius: var(--corner-control);
		cursor: pointer;
	}

	@media (hover: hover) {
		.more:hover {
			color: var(--color-accent);
		}
	}

	/* Phones upright: the bar is tight */
	@media (max-width: 639px) {
		.more {
			width: 1rem;
		}
	}
</style>
