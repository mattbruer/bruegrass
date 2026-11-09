<script>
	/**
	 * One bar: its chords over its words, a barline before it (and after,
	 * at the end of a row; a double one at the end of a section). Chords
	 * are spaced by their beats. A bar with nothing new in it shows %.
	 */

	/**
	 * @type {{
	 *   bar: import('../../lyricChart/chartRows.js').RowBar,
	 *   label: (chord: string) => string,
	 *   closesRow: boolean
	 * }}
	 */
	let { bar, label, closesRow } = $props();

	let nothingNew = $derived(!bar.words && bar.chords.every((chord) => !chord.shown));
</script>

<div
	class="bar"
	class:closes-row={closesRow}
	class:ends-section={bar.endsSection}
	data-bar={bar.index}
>
	<div class="chords">
		{#if bar.meterChange}<span class="meter">{bar.meterChange}</span>{/if}
		{#if nothingNew}
			<span class="repeat" aria-label="Same as the last bar">%</span>
		{:else}
			{#each bar.chords as chord, c (c)}
				<span class="chord" style:flex-grow={chord.length}
					>{chord.shown ? label(chord.name) : ''}</span
				>
			{/each}
		{/if}
	</div>
	<div class="words">{bar.words}</div>
</div>

<style>
	.bar {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		min-width: max-content;
		padding: 0.1rem 0.6rem;
		border-left: 1.5px solid currentColor;
	}

	.closes-row {
		border-right: 1.5px solid currentColor;
	}

	.ends-section {
		border-right: 4px double currentColor;
	}

	.bar:global(.playing) {
		background: color-mix(in oklab, var(--color-accent), transparent 80%);
	}

	.chords {
		display: flex;
		gap: 0.4rem;
		font-weight: 700;
		color: var(--color-accent);
	}

	.chord {
		flex-basis: 0;
		white-space: nowrap;
	}

	.repeat {
		color: var(--color-ink-soft);
	}

	.meter {
		color: var(--color-ink);
	}

	.words {
		white-space: nowrap;
	}

	/* Keep both lines' height when one is empty, so bars line up */
	.chords:empty::before,
	.chord:empty::before,
	.words:empty::before {
		content: '\00a0';
	}
</style>
