<script>
	/**
	 * Where the recording is, with tenths (and how long it is, if asked). Its
	 * box is as wide as the longest time this recording can show, so it never
	 * changes width while it counts and nothing beside it moves.
	 */
	import { formatClock } from '$lib/utils/formatClock.js';

	/** @type {{ time: number, duration: number, withLength?: boolean, class?: string }} */
	let { time, duration, withLength = false, class: className = '' } = $props();

	const length = $derived(formatClock(duration));
	/** Every digit the longest time has, as zeros: the widest it can be. */
	const widest = $derived(
		formatClock(duration, { tenths: true }).replace(/\d/g, '0') + (withLength ? ` / ${length}` : '')
	);
</script>

<span class="clock tabular-nums {className}">
	<span class="sizer" aria-hidden="true">{widest}</span>
	<span class="now">{formatClock(time, { tenths: true })}{withLength ? ` / ${length}` : ''}</span>
</span>

<style>
	/* The hidden widest time sets the width; the real one sits over it */
	.clock {
		display: inline-grid;
	}
	.sizer,
	.now {
		grid-area: 1 / 1;
		white-space: nowrap;
	}
	.sizer {
		visibility: hidden;
	}
</style>
