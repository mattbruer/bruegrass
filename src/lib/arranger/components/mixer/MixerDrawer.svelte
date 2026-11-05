<script>
	/**
	 * The mixer, in a tray that slides up over the bottom of the page. It
	 * doesn't block anything, so the chart stays visible and playback carries
	 * on while you mix. A handle on the bottom edge opens it; Close, the
	 * Mixer button or Escape closes it.
	 */
	import { useArranger } from '../../state/context.js';
	import Mixer from './Mixer.svelte';
	import SlidersIcon from '../icons/SlidersIcon.svelte';

	const { layout } = useArranger();

	/** The handle hides while the drawer is open, and while the phone keypad needs the space. */
	let showHandle = $derived(!layout.mixerOpen && !layout.keypadVisible);

	function closeOnEscape(/** @type {KeyboardEvent} */ event) {
		if (event.key === 'Escape' && layout.mixerOpen) layout.mixerOpen = false;
	}
</script>

<svelte:window onkeydown={closeOnEscape} />

{#if showHandle}
	<button
		type="button"
		class="handle"
		aria-controls="mixer-drawer"
		onclick={() => (layout.mixerOpen = true)}
	>
		<SlidersIcon />
		Mixer ▲
	</button>
{/if}

<div
	id="mixer-drawer"
	class="drawer"
	class:open={layout.mixerOpen}
	bind:offsetHeight={layout.mixerHeight}
	role="region"
	aria-label="Mixer"
	inert={!layout.mixerOpen}
>
	<div class="mx-auto max-w-5xl px-4 pt-3 pb-5 sm:px-8">
		<div class="mb-2 flex items-center justify-between">
			<h2 class="font-semibold">Mixer</h2>
			<button
				type="button"
				class="ui-button px-3 py-1 text-sm"
				aria-label="Close mixer"
				onclick={() => (layout.mixerOpen = false)}
			>
				Close ✕
			</button>
		</div>
		<Mixer />
	</div>
</div>

<style>
	/* A tab on the bottom edge of the screen, so the mixer is always findable */
	.handle {
		position: fixed;
		bottom: env(safe-area-inset-bottom, 0px);
		left: 50%;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transform: translateX(-50%);
		border-radius: var(--corner-control) var(--corner-control) 0 0;
		background: var(--color-surface);
		padding: 0.5rem 1.25rem;
		font-weight: 600;
		color: var(--color-ink);
		box-shadow:
			-4px -4px 10px var(--shadow-light-edge),
			4px -2px 10px var(--shadow-dark-edge);
	}

	.handle:hover {
		color: var(--color-accent);
	}

	.drawer {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		max-height: 80vh;
		overflow-y: auto;
		background: var(--color-surface);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		box-shadow: 0 -8px 20px var(--shadow-dark-edge);
		/* Closed: below the screen. Hidden only once it has slid away. */
		transform: translateY(100%);
		visibility: hidden;
		transition:
			transform 0.25s ease,
			visibility 0s linear 0.25s;
	}

	.drawer.open {
		transform: translateY(0);
		visibility: visible;
		transition: transform 0.25s ease;
	}
</style>
