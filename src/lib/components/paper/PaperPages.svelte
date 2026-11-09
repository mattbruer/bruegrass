<script>
	/**
	 * Anything laid out on sheets of paper. Give it blocks and a snippet
	 * that draws one; the blocks flow onto pages (a block is never split).
	 * Pages sit side by side as many as fit; the rest are a swipe away on a
	 * touch screen, or the arrows. Printing gives one sheet per page.
	 *
	 * The blocks are first drawn off screen to measure them, so pages break
	 * the same on every screen and on paper. The text is drawn as large as
	 * it can be while the whole song still fits one page, in columns if that
	 * helps (or, for a very long song, over several pages); `size` overrides that.
	 * Spare room on a page goes between the blocks.
	 * Each page is marked `data-sheet`, so a follower can bring it into view.
	 */
	import { onMount, tick } from 'svelte';
	import { PAPER, CONTENT_HEIGHT } from './paper.js';
	import { paginate } from './paginate.js';
	import { columnWidth, pagesOfColumns, extraGap, COLUMN_GAP_PX } from './columnLayout.js';
	import { chooseTextScale } from './chooseTextScale.js';
	import { pageScale, pagesSideBySide, PAGE_GAP_PX, NAV_ROOM_PX } from './fitPages.js';
	import PageNav from './PageNav.svelte';

	/**
	 * @type {{
	 *   blocks: any[],
	 *   block: import('svelte').Snippet<[any]>,
	 *   coveredBelow?: number,
	 *   size?: number,
	 *   textScale?: number
	 * }}
	 *   coveredBelow: pixels at the bottom of the window hidden under something fixed (a player bar)
	 *   size: a text scale to use (1 = the blocks' own size), or 0 to pick the largest that fits
	 *   textScale: the scale in use, for a size control to step from
	 */
	let { blocks, block, coveredBelow = 0, size = 0, textScale = $bindable(1) } = $props();

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
	/** The columns on each page, and the scale and columns the off-screen copy is drawn at. */
	let columns = $state(1);

	let blockHeights = $derived(blocks.map((_, i) => heights[i] ?? 0));
	let columnBlocks = $derived(paginate(blockHeights, CONTENT_HEIGHT));
	let pages = $derived(pagesOfColumns(columnBlocks, columns));
	let gap = $derived(extraGap(columnBlocks, blockHeights));
	let scale = $derived(pageScale(width, windowHeight - pagesTop - coveredBelow - NAV_ROOM_PX));
	let step = $derived(PAPER.width * scale + PAGE_GAP_PX);
	let showing = $derived(pagesSideBySide(width, scale));

	/** The scale the off-screen copy is drawn at while searching for the one to use. */
	let probe = $state(1);
	let probeColumns = $state(1);
	let settledHeight = 0;
	let busy = false;
	let again = false;

	/** @type {import('./chooseTextScale.js').MeasureAt} */
	async function measureAt(scale, columnCount) {
		probe = scale;
		probeColumns = columnCount;
		await tick();
		const children = measurer ? [...measurer.children] : [];
		return {
			heights: children.map((child) => /** @type {HTMLElement} */ (child).offsetHeight * scale),
			overflows: children.some((child) => child.scrollWidth > child.clientWidth + 1)
		};
	}

	/** Pick the text scale, then measure at it. Overlapping calls run one after the other. */
	async function layOut() {
		if (busy) {
			again = true;
			return;
		}
		busy = true;
		try {
			do {
				again = false;
				const layout = await chooseTextScale(measureAt, size);
				heights = (await measureAt(layout.scale, layout.columns)).heights;
				textScale = layout.scale;
				columns = layout.columns;
				settledHeight = measurer?.offsetHeight ?? 0;
			} while (again);
		} finally {
			busy = false;
		}
	}

	$effect(() => {
		void blocks;
		void size;
		tick().then(layOut);
	});

	// Fonts arriving, or a setting changing how chords read, change the heights
	onMount(() => {
		if (!measurer) return;
		const observer = new ResizeObserver(() => {
			const settled = !busy && probe === textScale && probeColumns === columns;
			if (settled && measurer && measurer.offsetHeight !== settledHeight) layOut();
		});
		observer.observe(measurer);
		document.fonts.ready.then(layOut);
		document.fonts.addEventListener('loadingdone', layOut);
		return () => {
			observer.disconnect();
			document.fonts.removeEventListener('loadingdone', layOut);
		};
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

<div
	class="measurer"
	bind:this={measurer}
	style:width="{columnWidth(probeColumns) / probe}px"
	aria-hidden="true"
>
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
				<div class="columns" style:gap="{COLUMN_GAP_PX}px">
					{#each page as column, c (c)}
						<div class="column" style:width="{columnWidth(columns)}px">
							{#each column as index, i (index)}
								<div
									class="block"
									style:height={heights[index] ? `${heights[index]}px` : undefined}
									style:margin-top={i > 0 ? `${gap}px` : undefined}
								>
									<div
										class="scaled"
										style:width="{columnWidth(columns) / textScale}px"
										style:transform="scale({textScale})"
									>
										{@render block(blocks[index])}
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

{#if pages.length > showing}
	<PageNav {current} count={pages.length} {showing} onGoTo={goTo} />
{/if}

<style>
	/* Rows stay on one line, so growing the text shrinks the page's room, not the rows */
	.measurer,
	.sheet {
		--bars-wrap: nowrap;
	}

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

	.columns {
		display: flex;
	}

	.column {
		flex: none;
	}

	.scaled {
		transform-origin: top left;
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
		/* Paper is white whatever the theme: its text colours are fixed too */
		--color-ink: black;
		--color-ink-soft: #555;
		--color-accent: #2563eb;

		background: white;
		color: black;
		border: 1px solid #ccc;
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
