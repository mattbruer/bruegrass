<script>
	/**
	 * The melody drawn as sheet music. It redraws once you pause typing, and
	 * while the band plays it follows along: the sounding note lights up, a
	 * cursor glides across the staff, and a new line scrolls into view.
	 *
	 * The notation is at concert pitch before the Key menu. It's drawn as the
	 * song sounds, or, with a capo or a key change, in the key of the
	 * guitar's shapes, for reading with the capo on.
	 */
	import { useArranger } from '../../state/context.js';
	import { drawSheetMusic } from '../../melody/drawSheetMusic.js';
	import { followSheetMusic } from '../../melody/followSheetMusic.js';
	import SheetViewToggle from './SheetViewToggle.svelte';

	/** Redraw this long after the last keystroke, not on every one. */
	const REDRAW_DELAY_MS = 200;

	const { arrangement, melody, player } = useArranger();

	/** Both views are the same with no capo or key change, so the tabs only show when they differ. */
	let canTranspose = $derived(arrangement.key !== null && arrangement.pitchShift !== 0);
	let drawnTranspose = $derived(
		canTranspose && melody.sheetView === 'shapes' ? -arrangement.capoFret : arrangement.transpose
	);

	/** @type {HTMLDivElement | undefined} */
	let page = $state();

	// Draw the notation (after a pause in typing)
	$effect(() => {
		const notation = melody.notation;
		const transpose = drawnTranspose;
		const target = page;
		if (!melody.hasNotation) {
			melody.clearDrawing();
			return;
		}
		if (!target) return;

		let replaced = false;
		const timer = setTimeout(async () => {
			const drawn = await drawSheetMusic(target, notation, { transpose });
			if (!replaced) melody.drawn = drawn;
		}, REDRAW_DELAY_MS);

		return () => {
			replaced = true; // newer typing wins
			clearTimeout(timer);
		};
	});

	// Follow along while playing
	$effect(() => {
		const svg = page?.querySelector('svg');
		const notes = melody.notesOnPage;
		if (!player.isPlaying || !svg || notes.length === 0) return;

		return followSheetMusic({
			svg,
			notes,
			melodyTimeNow: player.melodyTimeNow,
			onNewLine: scrollLineIntoView
		});
	});

	/**
	 * When the cursor moves to a line that's off screen, bring it into view,
	 * but only if you're looking at the sheet music (so it never pulls you
	 * away from the chart).
	 * @param {Element} cursor
	 */
	function scrollLineIntoView(cursor) {
		if (!isOnScreen(page) || isOnScreen(cursor, { entirely: true })) return;
		cursor.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	/**
	 * @param {Element | undefined} element
	 * @param {{ entirely?: boolean }} [options]
	 */
	function isOnScreen(element, { entirely = false } = {}) {
		if (!element) return false;
		const box = element.getBoundingClientRect();
		return entirely
			? box.top >= 0 && box.bottom <= window.innerHeight
			: box.bottom > 0 && box.top < window.innerHeight;
	}
</script>

{#if melody.hasNotation}
	<section aria-label="Sheet music">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-xl font-semibold">Sheet music</h2>
			{#if canTranspose}
				<SheetViewToggle />
			{/if}
		</div>

		<div bind:this={page} class="paper overflow-x-auto p-2"></div>
	</section>
{/if}

<style>
	/*
	 * Always black notes on white paper, whatever the theme. abcjs draws in
	 * the current text colour, so setting `color` here colours the music.
	 */
	.paper {
		border-radius: var(--corner-card);
		background: var(--sheet-music-paper);
		color: var(--sheet-music-ink);
		box-shadow: var(--shadow-inset-small);
	}

	/* Classes set by followSheetMusic.js: the sounding note, and the cursor */
	:global(.abcjs-playing) {
		fill: var(--color-accent);
	}

	:global(.abcjs-cursor) {
		fill: var(--color-accent);
		opacity: 0.6;
	}
</style>
