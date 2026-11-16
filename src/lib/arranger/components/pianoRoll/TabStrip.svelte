<script>
	/**
	 * The part as TAB, under the piano roll and scrolling with it: a line
	 * per string, top line first, and each note's fret number on its
	 * string's line, where the note starts. Tap a number to play that note
	 * on the next string that has it.
	 */
	import { lineY } from '../../tab/tabLayout.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   tabNotes: import('../../tab/fingering.js').TabNote[],
	 *   board: import('../../tab/fretboards.js').Fretboard,
	 *   tickWidth: number,
	 *   width: number,
	 *   labelWidth: number,
	 *   onChoose: (tabNote: import('../../tab/fingering.js').TabNote) => void
	 * }}
	 */
	let { tabNotes, board, tickWidth, width, labelWidth, onChoose } = $props();
</script>

<div class="names sticky left-0 z-10 shrink-0" style:width="{labelWidth}px">
	{#each board.strings as string, index (index)}
		<span class="name" style:top="{lineY(index)}px">{string.name}</span>
	{/each}
</div>
<div class="lines relative" style:width="{width}px" aria-label="{board.name} TAB">
	{#each board.strings, index (index)}
		<span class="line" style:top="{lineY(index)}px"></span>
	{/each}
	{#each tabNotes as tabNote, index (index)}
		{#if tabNote.place}
			<button
				type="button"
				class="fret"
				style:left="{tabNote.note.start * tickWidth}px"
				style:top="{lineY(tabNote.place.string)}px"
				aria-label="Fret {tabNote.place.fret} on the {board.strings[tabNote.place.string]
					.name} string"
				onclick={() => onChoose(tabNote)}
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
		border-top: 1px solid var(--color-line);
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
	/* The number sits on its string's line, hiding the line behind it */
	.fret {
		position: absolute;
		transform: translateY(-50%);
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
	.fret:focus-visible {
		outline: 2px solid var(--color-accent);
	}
</style>
