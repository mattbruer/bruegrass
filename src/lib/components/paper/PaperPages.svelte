<script>
	/**
	 * Anything laid out on sheets of paper. Give it blocks and a snippet
	 * that draws one; the blocks flow onto pages (a block is never split).
	 * Pages sit side by side as many as fit; the rest are a swipe away on a
	 * touch screen, or the arrows. Printing gives one sheet per page.
	 *
	 * The blocks are first drawn off screen at full size to measure them,
	 * so pages break the same on every screen and on paper.
	 * Each page is marked `data-sheet`, so a follower can bring it into view.
	 */
	import { onMount, tick } from 'svelte';
	import { PAPER, CONTENT_WIDTH, CONTENT_HEIGHT } from './paper.js';
	import { paginate } from './paginate.js';
	import { pageScale, pagesSideBySide, PAGE_GAP_PX, NAV_ROOM_PX } from './fitPages.js';
	import PageNav from './PageNav.svelte';

	/**
	 * @type {{ blocks: any[], block: import('svelte').Snippet<[any]>, coveredBelow?: number }}
	 *   coveredBelow: pixels at the bottom of the window hidden under something fixed (a player bar)
	 */
	let { blocks, block, coveredBelow = 0 } = $props();

	/** @type {HTMLDivElement | undefined} */
	let measurer = $state();
	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	let heights = $state(/** @type {number[]} */ ([]));
	let width = $state(0);
	let windowHeight = $state(0);
	/** Where the pages start, from the top of the document. */
	let pagesTop = $state(0);
	let current = $state(0);

	let pages = $derived(
		paginate(
			blocks.map((_, i) => heights[i] ?? 0),
			CONTENT_HEIGHT
		)
	);
	let scale = $derived(pageScale(width, windowHeight - pagesTop - coveredBelow - NAV_ROOM_PX));
	let step = $derived(PAPER.width * scale + PAGE_GAP_PX);
	let showing = $derived(pagesSideBySide(width, scale));

	function measure() {
		if (!measurer) return;
		heights = [...measurer.children].map(
			(child) => /** @type {HTMLElement} */ (child).offsetHeight
		);
	}

	$effect(() => {
		void blocks;
		tick().then(measure);
	});

	// Fonts arriving, or a setting changing how chords read, change the heights
	onMount(() => {
		if (!measurer) return;
		const observer = new ResizeObserver(measure);
		observer.observe(measurer);
		return () => observer.disconnect();
	});

	/** For page-turn keys and taps (see turnPages.js). */
	export function next() {
		goTo(current + 1);
	}

	export function previous() {
		goTo(current - 1);
	}

	// Moving into or out of full screen moves the pages and changes what covers them
	$effect(() => {
		void coveredBelow;
		tick().then(notePagesTop);
	});

	function notePagesTop() {
		if (scroller) pagesTop = scroller.getBoundingClientRect().top + window.scrollY;
	}

	onMount(notePagesTop);

	function noteCurrentPage() {
		if (scroller) current = Math.round(scroller.scrollLeft / step);
	}

	/** @param {number} page */
	function goTo(page) {
		page = Math.max(0, Math.min(pages.length - 1, page));
		current = page;
		scroller?.scrollTo({ left: page * step, behavior: 'smooth' });
	}
</script>

<svelte:window bind:innerHeight={windowHeight} onresize={notePagesTop} />

<div class="measurer" bind:this={measurer} style:width="{CONTENT_WIDTH}px" aria-hidden="true">
	{#each blocks as item, index (index)}
		<div class="block">{@render block(item)}</div>
	{/each}
</div>

<div
	class="pages"
	bind:this={scroller}
	bind:clientWidth={width}
	onscroll={noteCurrentPage}
	style:gap="{PAGE_GAP_PX}px"
>
	{#each pages as page, p (p)}
		<div
			class="slot"
			data-sheet
			style:width="{PAPER.width * scale}px"
			style:height="{PAPER.height * scale}px"
		>
			<div
				class="sheet"
				style:width="{PAPER.width}px"
				style:height="{PAPER.height}px"
				style:padding="{PAPER.margin}px"
				style:transform="scale({scale})"
			>
				{#each page as index (index)}
					<div class="block">{@render block(blocks[index])}</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

{#if pages.length > showing}
	<PageNav {current} count={pages.length} {showing} onGoTo={goTo} />
{/if}

<style>
	.measurer {
		position: absolute;
		left: -10000px;
		top: 0;
		visibility: hidden;
	}

	/* flow-root keeps a block's margins inside it, so they count in its height */
	.block {
		display: flow-root;
	}

	.pages {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		padding-bottom: 0.5rem;
	}

	/* Centred when they all fit, still reachable when they don't */
	.slot:first-child {
		margin-left: auto;
	}

	.slot:last-child {
		margin-right: auto;
	}

	.slot {
		flex: none;
		scroll-snap-align: start;
	}

	.sheet {
		transform-origin: top left;
		background: var(--color-raised);
		color: var(--color-ink);
		border: 1px solid var(--color-line);
		box-shadow: 0 var(--shadow-reach-small) var(--shadow-reach-large) var(--shadow-dark-edge);
	}

	@page {
		size: letter;
		margin: 0;
	}

	@media print {
		.measurer {
			display: none;
		}

		.pages {
			display: block;
			overflow: visible;
			padding: 0;
		}

		.slot {
			width: auto !important;
			height: auto !important;
			margin: 0 !important;
			break-after: page;
		}

		/* Paper is white whatever the screen's theme */
		.sheet {
			transform: none !important;
			border: 0;
			box-shadow: none;
			background: white;
			color: black;
		}
	}
</style>
