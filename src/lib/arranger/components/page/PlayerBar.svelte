<script>
	/**
	 * The bar fixed to the bottom of the screen, the same on phone and
	 * desktop: Play and Stop, the tempo, and the buttons that open the
	 * editor and the mixer above it. It steps aside while the phone keypad
	 * is up.
	 */
	import { useArranger } from '../../state/context.js';
	import TransportButtons from '../player/TransportButtons.svelte';
	import TempoField from '../player/TempoField.svelte';
	import DrawerButton from './DrawerButton.svelte';
	import PencilIcon from '../icons/PencilIcon.svelte';
	import SlidersIcon from '../icons/SlidersIcon.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { layout } = useArranger();
</script>

<div class="bar" class:hidden-by-keypad={layout.keypadVisible} bind:offsetHeight={layout.barHeight}>
	<div class="bar-content mx-auto max-w-5xl px-3 sm:px-8">
		<TransportButtons />
		<TempoField />
		<div class="drawers">
			<DrawerButton id="edit" label="Edit" tip={TIPS.player.edit}>
				{#snippet icon()}<PencilIcon />{/snippet}
			</DrawerButton>
			<DrawerButton id="mixer" label="Mixer" tip={TIPS.player.mixer}>
				{#snippet icon()}<SlidersIcon />{/snippet}
			</DrawerButton>
		</div>
	</div>
</div>

<style>
	.bar {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 25; /* over a drawer sliding down behind it */
		background: var(--color-surface);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		box-shadow: 0 -4px 14px var(--shadow-dark-edge);
	}

	.hidden-by-keypad {
		visibility: hidden;
	}

	.bar-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.6rem;
	}

	/* A phone on its side: a slimmer bar, so the mixer above it still fits without scrolling */
	@media (max-height: 600px) {
		.bar-content {
			padding-block: 0.3rem;
		}

		.bar-content :global(.ui-button) {
			padding-block: 0.3rem;
		}
	}

	.drawers {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}
</style>
