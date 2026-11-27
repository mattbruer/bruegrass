<script>
	/**
	 * A button that opens a small panel under it; a click anywhere else,
	 * Escape or scrolling closes it. The panel goes in the page's top layer
	 * (a native popover), so a scrolling box around the button (the
	 * transcription grid) can't clip it.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/**
	 * @type {{
	 *   button: import('svelte').Snippet, children: import('svelte').Snippet,
	 *   tip?: string, align?: 'left' | 'right', class?: string
	 * }} class: for the button
	 */
	let { button, children, tip, align = 'left', class: className = '' } = $props();

	/** Space between the button and its panel (px). */
	const GAP = 6;
	/** The least space kept between the panel and the screen's edges (px). */
	const EDGE = 8;
	/** A panel squeezed by the screen's bottom stays at least this tall, scrolling (px). */
	const MIN_HEIGHT = 160;

	let open = $state(false);
	/** @type {HTMLDetailsElement | undefined} */
	let details = $state();
	/** @type {HTMLElement | undefined} */
	let summary = $state();
	/** @type {HTMLElement | undefined} */
	let panel = $state();

	$effect(() => {
		if (!open || !panel || !summary) return;
		placeUnder(panel, summary.getBoundingClientRect());
		panel.showPopover();
		keepOnScreen(panel);
		const shown = panel;
		return () => {
			if (shown.matches(':popover-open')) shown.hidePopover();
		};
	});

	/**
	 * @param {HTMLElement} element
	 * @param {DOMRect} box the button
	 */
	function placeUnder(element, box) {
		element.style.top = `${box.bottom + GAP}px`;
		element.style.left = align === 'left' ? `${box.left}px` : 'auto';
		element.style.right = align === 'right' ? `${window.innerWidth - box.right}px` : 'auto';
	}

	/**
	 * Slide a shown panel back inside the screen's sides, and let it scroll
	 * when it's taller than the room under its button (a phone).
	 * @param {HTMLElement} element
	 */
	function keepOnScreen(element) {
		const box = element.getBoundingClientRect();
		const overRight = box.right - (window.innerWidth - EDGE);
		if (overRight > 0) {
			element.style.left = `${Math.max(EDGE, box.left - overRight)}px`;
			element.style.right = 'auto';
		}
		const room = window.innerHeight - EDGE - box.top;
		element.style.maxHeight = box.height > room ? `${Math.max(room, MIN_HEIGHT)}px` : '';
	}

	/** @param {Event} event */
	function closeIfOutside(event) {
		const target = /** @type {Node} */ (event.target);
		if (open && !details?.contains(target) && !panel?.contains(target)) open = false;
	}

	/** @param {KeyboardEvent} event */
	function closeOnEscape(event) {
		if (open && event.key === 'Escape') open = false;
	}
</script>

<svelte:window
	onpointerdown={closeIfOutside}
	onkeydown={closeOnEscape}
	onscrollcapture={closeIfOutside}
/>

<details class="popover" bind:open bind:this={details}>
	<summary
		bind:this={summary}
		class="ui-button {className}"
		class:ui-button-on={open}
		use:tooltip={tip}>{@render button()}</summary
	>
	<div class="panel ui-card" popover="manual" bind:this={panel}>
		{@render children()}
	</div>
</details>

<style>
	summary {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		list-style: none;
		cursor: pointer;
		white-space: nowrap;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.panel:popover-open {
		position: fixed;
		inset: auto;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: max-content;
		overflow-y: auto;
		padding: 0.6rem;
		color: var(--color-ink);
	}
</style>
