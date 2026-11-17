<script>
	/**
	 * Text that changes while you watch (a clock, bars and beats) without
	 * changing width: every digit sits centred in a cell of the same width
	 * (the app's font has digits of different widths), and the text sits in a
	 * box as wide as `widest`, lined up on its right, so whatever follows it
	 * stays put.
	 */
	/** @type {{ text: string, widest: string }} widest: the longest it can be (its digits are measured as zeros) */
	let { text, widest } = $props();
</script>

{#snippet cells(/** @type {string} */ value)}
	{#each value as char, index (index)}<span class:digit={/\d/.test(char)}>{char}</span>{/each}
{/snippet}

<span class="steady" aria-hidden="true"
	><span class="sizer">{@render cells(widest.replace(/\d/g, '0'))}</span><span class="now"
		>{@render cells(text)}</span
	></span
>

<style>
	/* The hidden widest text sets the width; the real one sits over it, on the right */
	.steady {
		display: inline-grid;
		justify-items: end;
		white-space: pre;
	}
	.sizer,
	.now {
		grid-area: 1 / 1;
	}
	.sizer {
		visibility: hidden;
	}
	.digit {
		display: inline-block;
		width: 1ch;
		text-align: center;
	}
</style>
