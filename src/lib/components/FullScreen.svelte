<script>
	/**
	 * Shows what's inside over the whole screen while `open`: above the top
	 * bar, the player bar and everything else, with a close button. Where the
	 * browser can also hide its own toolbars (a Mac, an iPad) it does; an
	 * iPhone can't, so there it just covers the page. Esc closes it too.
	 * What's inside stays the same component, so nothing is redrawn or lost.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open: boolean, children: import('svelte').Snippet, corner?: import('svelte').Snippet }} */
	let { open = $bindable(false), children, corner } = $props();

	/** @type {HTMLDivElement | undefined} */
	let frame = $state();

	$effect(() => {
		if (!open || !frame) return;
		const element = frame;
		element.requestFullscreen?.().catch(() => {}); // refused or unsupported: the page is still covered

		// Leaving the browser's full screen (Esc, a gesture) closes this too
		const left = () => {
			if (!document.fullscreenElement) open = false;
		};
		/** @param {KeyboardEvent} event */
		const escape = (event) => {
			if (event.key === 'Escape') open = false;
		};
		document.addEventListener('fullscreenchange', left);
		window.addEventListener('keydown', escape);
		return () => {
			document.removeEventListener('fullscreenchange', left);
			window.removeEventListener('keydown', escape);
			if (document.fullscreenElement === element) document.exitFullscreen().catch(() => {});
		};
	});
</script>

<div bind:this={frame} class:full={open}>
	{@render children()}
	{#if open}
		<div class="controls">
			{@render corner?.()}
			<button
				type="button"
				class="h-11 w-11 ui-button rounded-full text-xl"
				aria-label="Leave full screen"
				use:tooltip={TIPS.fullScreen.close}
				onclick={() => (open = false)}>✕</button
			>
		</div>
	{/if}
</div>

<style>
	.full {
		position: fixed;
		inset: 0;
		z-index: 100;
		overflow: auto;
		background: var(--color-surface-deep);
		padding: 1rem;
	}

	.controls {
		position: fixed;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 1;
		display: flex;
		gap: 0.5rem;
	}
</style>
