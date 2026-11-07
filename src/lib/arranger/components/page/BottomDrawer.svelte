<script>
	/**
	 * A tray that slides up above the player bar (the editor, the mixer). One
	 * is open at a time. It doesn't block anything, so the chart stays
	 * visible and playback carries on. Its button in the bar, Close or Escape
	 * closes it.
	 *
	 * @type {{
	 *   id: import('../../state/PageLayoutState.svelte.js').DrawerId,
	 *   title: string,
	 *   closeTip: string,
	 *   heading?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';

	let { id, title, closeTip, heading, children } = $props();

	const { layout } = useArranger();

	let open = $derived(layout.isOpen(id));
	let height = $state(0);

	// Only the open drawer reports its height, so the page leaves room for that one
	$effect(() => {
		if (open) layout.drawerHeight = height;
	});

	function closeOnEscape(/** @type {KeyboardEvent} */ event) {
		if (event.key !== 'Escape' || !open) return;
		// Esc closes the top-most thing first: a window open over the drawer (like the reverb plugin)
		const windowOnTop = document.querySelector('dialog[open]');
		if (!windowOnTop) layout.close();
	}
</script>

<svelte:window onkeydown={closeOnEscape} />

<div
	id="{id}-drawer"
	class="drawer"
	class:open
	style:bottom="{layout.drawerBottom}px"
	style:--below-drawer="{layout.drawerBottom}px"
	bind:offsetHeight={height}
	role="region"
	aria-label={title}
	inert={!open}
>
	<div class="drawer-content mx-auto max-w-5xl px-4 pt-3 pb-4 sm:px-8">
		<div class="mb-2 flex items-center gap-3">
			<h2 class="font-semibold">{title}</h2>
			<div class="mr-auto min-w-0">{@render heading?.()}</div>
			<button
				type="button"
				class="shrink-0 ui-button px-3 py-1 text-sm"
				aria-label="Close {title.toLowerCase()}"
				onclick={() => layout.close()}
				use:tooltip={closeTip}
			>
				Close ✕
			</button>
		</div>
		{@render children()}
	</div>
</div>

<style>
	.drawer {
		position: fixed;
		inset-inline: 0;
		z-index: 20;
		max-height: 75dvh;
		overflow-y: auto;
		background: var(--color-surface);
		box-shadow: 0 -8px 20px var(--shadow-dark-edge);
		/* Closed: slid down behind the player bar. Hidden only once it has slid away. */
		transform: translateY(100%);
		visibility: hidden;
		transition:
			transform 0.25s ease,
			visibility 0s linear 0.25s;
	}

	/* `none`, not translateY(0): any transform would make the drawer the frame
	   for fixed-position windows inside it (the EQ and reverb windows), so they
	   would sit relative to the drawer and could run off the bottom of the screen. */
	.drawer.open {
		transform: none;
		visibility: visible;
		transition: transform 0.25s ease;
	}

	/* A phone on its side: a drawer may use all the height between the top bar and the player bar */
	@media (max-height: 600px) {
		.drawer {
			max-height: calc(100dvh - 3.5rem - var(--below-drawer)); /* 3.5rem: the top bar */
		}

		.drawer-content {
			padding-top: 0.25rem;
			padding-bottom: 0.5rem;
		}
	}
</style>
