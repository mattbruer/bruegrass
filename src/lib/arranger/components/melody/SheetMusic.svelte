<script>
	/**
	 * The melody drawn as sheet music. It redraws once you pause typing, and
	 * while the band plays it follows along: the sounding note lights up, a
	 * cursor glides across the staff, and a new line scrolls into view.
	 */
	import { useArranger } from '../../state/context.js';
	import { drawSheetMusic } from '../../melody/drawSheetMusic.js';
	import { followSheetMusic } from '../../melody/followSheetMusic.js';

	/** Redraw this long after the last keystroke, not on every one. */
	const REDRAW_DELAY_MS = 200;

	const { melody, player } = useArranger();

	/** @type {HTMLDivElement | undefined} */
	let page = $state();

	// Draw the notation (after a pause in typing)
	$effect(() => {
		const notation = melody.notation;
		const target = page;
		if (!melody.hasNotation) {
			melody.clearDrawing();
			return;
		}
		if (!target) return;

		let replaced = false;
		const timer = setTimeout(async () => {
			const drawn = await drawSheetMusic(target, notation);
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
	<section class="mt-10" aria-label="Sheet music">
		<h2 class="mb-3 text-xl font-semibold">Sheet music</h2>

		{#if melody.warnings.length > 0}
			<ul class="mb-3 list-disc pl-6 text-sm text-danger">
				{#each melody.warnings as warning, index (index)}
					<li>{warning}</li>
				{/each}
			</ul>
		{/if}

		<div bind:this={page} class="overflow-x-auto ui-well p-2"></div>
	</section>
{/if}

<style>
	/* Classes set by followSheetMusic.js: the sounding note, and the cursor */
	:global(.abcjs-playing) {
		fill: var(--color-accent);
	}

	:global(.abcjs-cursor) {
		fill: var(--color-accent);
		opacity: 0.6;
	}
</style>
