<script>
	/**
	 * The melody drawn as sheet music (the one place it's drawn; everything
	 * else reads the tune from MelodyState). It redraws once you pause typing, and
	 * while the band plays it follows along: the sounding note lights up, a
	 * cursor glides across the staff, and a new line scrolls into view.
	 *
	 * The notation is at concert pitch before the Key menu. It's drawn as the
	 * song sounds, or, with a capo or a key change, in the key of the
	 * guitar's shapes, for reading with the capo on.
	 *
	 * `notation` draws other ABC instead of the tune (Transcribe's bass line);
	 * it isn't followed while playing. `clock` follows something other than
	 * the band (Transcribe's recording), as the piano roll's does.
	 */
	import { useArranger } from '../../state/context.js';
	import { drawSheetMusic } from '../../melody/drawSheetMusic.js';
	import { playedQuarters, sheetEvents } from '../../melody/follow.js';
	import { followSheetMusic } from '../../melody/followSheetMusic.js';
	import { pickupsOnPaper } from '../../melody/roll/pickupBar.js';
	import SheetViewToggle from './SheetViewToggle.svelte';

	const { arrangement, melody, player } = useArranger();

	/** @type {{ notation?: string, clock?: { playing: boolean, quarters: () => number } }} */
	let { notation: otherNotation, clock } = $props();
	const playing = $derived(clock ? clock.playing : player.isPlaying);
	const timeNow = $derived(clock ? clock.quarters : player.melodyTimeNow);
	const notation = $derived(
		otherNotation ??
			(melody.voices
				? pickupsOnPaper(
						melody.notation,
						melody.voices.map((voice) => voice.score)
					)
				: melody.notation)
	);

	/** Both views are the same with no capo or key change, so the tabs only show when they differ. */
	let canTranspose = $derived(arrangement.key !== null && arrangement.pitchShift !== 0);
	let drawnTranspose = $derived(
		canTranspose && melody.sheetView === 'shapes' ? -arrangement.capoFret : arrangement.transpose
	);

	/** @type {HTMLDivElement | undefined} */
	let page = $state();
	let windowWidth = $state(0);

	/** Redraw this long after the last keystroke, not on every one. */
	const REDRAW_DELAY_MS = 200;

	/** Every drawn note as played, with where it's drawn (null: nothing drawn yet). */
	let drawnNotes = $state.raw(/** @type {import('abcjs').NoteTimingEvent[] | null} */ (null));

	// Draw again when the tune, its key on the page or the page's width changes
	$effect(() => {
		const abc = notation;
		const transpose = drawnTranspose;
		const target = page;
		void windowWidth;
		if (!target) return;

		let replaced = false;
		const timer = setTimeout(async () => {
			const drawn = await drawSheetMusic(target, abc, { transpose });
			if (!replaced) drawnNotes = drawn;
		}, REDRAW_DELAY_MS);

		return () => {
			replaced = true; // newer typing wins
			clearTimeout(timer);
		};
	});

	/** The drawn notes on the melody's clock. */
	let notesOnPage = $derived(
		drawnNotes && melody.sequence && otherNotation === undefined
			? sheetEvents(drawnNotes, playedQuarters(melody.sequence), melody.pickup)
			: []
	);

	// Follow along while playing
	$effect(() => {
		const svg = page?.querySelector('svg');
		const notes = notesOnPage;
		if (!playing || !svg || notes.length === 0) return;

		return followSheetMusic({
			svg,
			notes,
			melodyTimeNow: timeNow,
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

<svelte:window bind:innerWidth={windowWidth} />

{#if notation.trim() !== ''}
	<section aria-label="Sheet music">
		{#if canTranspose}
			<div class="mb-3 flex justify-end">
				<SheetViewToggle />
			</div>
		{/if}

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
		fill: var(--sheet-music-cursor, #e11d1d);
		opacity: 0.85;
	}
</style>
