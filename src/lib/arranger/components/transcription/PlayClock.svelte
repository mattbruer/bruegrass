<script>
	/**
	 * Where the recording is, with tenths (and how long it is, if asked). The
	 * time sits in a box as wide as the longest time this recording can show,
	 * lined up on its right, so it never changes width while it counts: the
	 * slash and the length after it stay put, and nothing beside it moves.
	 */
	import { formatClock } from '$lib/utils/formatClock.js';

	/** @type {{ time: number, duration: number, withLength?: boolean, class?: string }} */
	let { time, duration, withLength = false, class: className = '' } = $props();

	/** Every digit the longest time has, as zeros: the widest it can be. */
	const widest = $derived(formatClock(duration, { tenths: true }).replace(/\d/g, '0'));
</script>

<span class="clock tabular-nums {className}"
	><span class="time"
		><span class="sizer" aria-hidden="true">{widest}</span><span class="now"
			>{formatClock(time, { tenths: true })}</span
		></span
	>{#if withLength}&nbsp;/ {formatClock(duration)}{/if}</span
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
</style>
