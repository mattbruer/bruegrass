<script>
	/**
	 * The part as TAB: a line per string, top line first, bar lines, and
	 * each note's fret number on its string's line, where the note starts
	 * (a little in from the barline, as TAB is written: tabLayout.js).
	 * Tap a number to pick its note (the roll's own selection); then type a
	 * fret to change the note's pitch on that string (two digits typed
	 * quickly make 10 and up), ↑ ↓ to play it on the string above or below,
	 * or Delete to remove it.
	 */
	import { lineY, tabHeight, tabX } from '../../tab/tabLayout.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   tabNotes: import('../../tab/fingering.js').TabNote[],
	 *   board: import('../../tab/fretboards.js').Fretboard,
	 *   bars: import('../../melody/roll/readScore.js').ScoreBar[],
	 *   tickWidth: number,
	 *   width: number,
	 *   labelWidth: number,
	 *   selected: import('../../melody/roll/editNotes.js').DrawnNote | null,
	 *   onSelect: (tabNote: import('../../tab/fingering.js').TabNote) => void,
	 *   onFret: (tabNote: import('../../tab/fingering.js').TabNote, fret: number) => void,
	 *   onString: (tabNote: import('../../tab/fingering.js').TabNote, direction: -1 | 1) => void,
	 *   onDelete: (tabNote: import('../../tab/fingering.js').TabNote) => void
	 * }}
	 */
	let {
		tabNotes,
		board,
		bars,
		tickWidth,
		width,
		labelWidth,
		selected,
		onSelect,
		onFret,
		onString,
		onDelete
	} = $props();

	const lastLine = $derived(lineY(board.strings.length - 1));
	/** Where each bar starts, and where the last one ends (ticks). */
	const barLines = $derived(
		bars.length ? [...bars.map((bar) => bar.start), bars.at(-1).start + bars.at(-1).length] : []
	);

	/** A second digit this soon after the first makes a two-digit fret. */
	const TWO_DIGITS_MS = 800;
	let typed = { digit: '', at: 0 };

	/**
	 * @param {KeyboardEvent} event
	 * @param {import('../../tab/fingering.js').TabNote} tabNote
	 */
	function key(event, tabNote) {
		if (/^[0-9]$/.test(event.key)) {
			const now = performance.now();
			const both = typed.digit + event.key;
			const twoDigits =
				typed.digit && now - typed.at < TWO_DIGITS_MS && Number(both) <= board.frets;
			onFret(tabNote, Number(twoDigits ? both : event.key));
			typed = twoDigits ? { digit: '', at: 0 } : { digit: event.key, at: now };
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			onString(tabNote, event.key === 'ArrowUp' ? -1 : 1);
		} else if (event.key === 'Delete' || event.key === 'Backspace') {
			onDelete(tabNote);
		} else return;
		event.preventDefault();
	}
</script>

<div
	class="names sticky left-0 z-10 shrink-0"
	style:width="{labelWidth}px"
	style:height="{tabHeight(board)}px"
>
	{#each board.strings as string, index (`${index}:${string.name}`)}
		<span class="name" style:top="{lineY(index)}px">{string.name}</span>
	{/each}
</div>
<div class="lines relative" style:width="{width}px" aria-label="{board.name} TAB">
	{#each board.strings, index (index)}
		<span class="line" style:top="{lineY(index)}px"></span>
	{/each}
	{#each barLines as start (start)}
		<span
			class="barline"
			style:left="{start * tickWidth}px"
			style:top="{lineY(0)}px"
			style:height="{lastLine - lineY(0)}px"
		></span>
	{/each}
	{#each tabNotes as tabNote, index (`${index}:${tabNote.place?.string}:${tabNote.place?.fret}`)}
		{#if tabNote.place}
			<button
				type="button"
				class="fret"
				class:picked={tabNote.note === selected}
				aria-pressed={tabNote.note === selected}
				style:left="{tabX(tabNote.note.start, bars, tickWidth)}px"
				style:top="{lineY(tabNote.place.string)}px"
				aria-label="Fret {tabNote.place.fret} on the {board.strings[tabNote.place.string]
					.name} string"
				onclick={() => onSelect(tabNote)}
				onkeydown={(event) => key(event, tabNote)}
				use:tooltip={TIPS.melody.tabFret}>{tabNote.place.fret}</button
			>
		{/if}
	{/each}
</div>

<style>
	.names,
	.lines {
		position: relative;
		background: var(--color-surface-deep);
	}
	.names {
		position: sticky;
	}
	.name {
		position: absolute;
		right: 0.5rem;
		transform: translateY(-50%);
		font-size: 0.7rem;
		color: var(--color-ink-soft);
	}
	.line {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--color-ink-faint);
	}
	.barline {
		position: absolute;
		width: 1px;
		background: var(--color-ink-soft);
	}
	/* The number sits centred on its moment and on its string's line, hiding the line behind it */
	.fret {
		position: absolute;
		transform: translate(-50%, -50%);
		min-width: 1rem;
		padding: 0 0.2rem;
		border-radius: var(--corner-small);
		background: var(--color-surface-deep);
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-ink);
		cursor: pointer;
	}
	@media (hover: hover) {
		.fret:hover {
			color: var(--color-accent);
		}
	}
	/* A bigger invisible tap area than the number, for a finger */
	.fret::before {
		content: '';
		position: absolute;
		inset: -0.4rem -0.35rem;
	}
	.fret.picked {
		background: var(--color-accent);
		color: var(--color-surface);
	}
	.fret:focus-visible {
		outline: 2px solid var(--color-accent);
	}
</style>
