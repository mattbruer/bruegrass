<script>
	/**
	 * Opens and closes the mixer drawer, for a page with its own controls
	 * (Tracks); the player bar has its own tile (MixerTile). Lit while open.
	 */
	import { useArranger } from '../../state/context.js';
	import SlidersIcon from '../icons/SlidersIcon.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { layout } = useArranger();
</script>

<button
	type="button"
	class="mixer ui-button"
	class:ui-button-on={layout.isOpen('mixer')}
	aria-expanded={layout.isOpen('mixer')}
	aria-controls="mixer-drawer"
	onclick={() => layout.toggle('mixer')}
	use:tooltip={TIPS.player.mixer}
>
	<SlidersIcon />
	<span class="sr-only">Mixer</span>
</button>

<style>
	.mixer {
		width: 3.25rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		padding: 0.2rem;
	}

	.mixer :global(svg) {
		height: 100%;
		width: auto;
	}
</style>
