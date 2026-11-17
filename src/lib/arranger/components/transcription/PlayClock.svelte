<script>
	/**
	 * Where the recording is, with tenths (and how long it is, if asked). It
	 * never changes width while it counts: every digit sits centred in a cell
	 * of the same width (the app's font has digits of different widths), and
	 * the time sits in a box as wide as the longest this recording can show,
	 * lined up on its right, so the slash and the length after it stay put.
	 */
	import { formatClock } from '$lib/utils/formatClock.js';

	/** @type {{ time: number, duration: number, withLength?: boolean, class?: string }} */
	let { time, duration, withLength = false, class: className = '' } = $props();

	/** Every digit the longest time has, as zeros: the widest it can be. */
	const widest = $derived(formatClock(duration, { tenths: true }).replace(/\d/g, '0'));
	const now = $derived(formatClock(time, { tenths: true }));
</script>

{#snippet cells(/** @type {string} */ text)}
	{#each text as char, index (index)}<span class:digit={/\d/.test(char)}>{char}</span>{/each}
{/snippet}

<span class="clock {className}" aria-label={withLength ? `${now} of ${formatClock(duration)}` : now}
	><span class="time" aria-hidden="true"
		><span class="sizer">{@render cells(widest)}</span><span class="now">{@render cells(now)}</span
		></span
	>{#if withLength}<span aria-hidden="true">&nbsp;/ {@render cells(formatClock(duration))}</span
		>{/if}</span
>

<style>
	.clock {
		white-space: nowrap;
	}
	/* The hidden widest time sets the width; the real one sits over it, on the right */
	.time {
		display: inline-grid;
		justify-items: end;
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
