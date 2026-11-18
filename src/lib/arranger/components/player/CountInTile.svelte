<script>
	/**
	 * The count-in, beside the metronome like Logic's: a key that says 1234,
	 * a row for each bar it counts. Each tap steps Off → 1 bar → 2 bars → Off;
	 * lit while on. Recording always counts in, the same number of bars.
	 * Hovered (or once on a tap), the digits light up one by one at the
	 * song's tempo, as if counting in.
	 */
	import { useArranger } from '../../state/context.js';
	import { COUNT_IN_BARS } from '../../playback/metronome/countIn.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const DIGITS = ['1', '2', '3', '4'];
	/** What each tap steps through: off, then each length in bars. */
	const CHOICES = [0, ...COUNT_IN_BARS];

	const { arrangement } = useArranger();
	const prefs = settings.metronome;

	const bars = $derived(prefs.countIn ? prefs.countInBars : 0);
	/** Rows drawn: one when off, so the key still says what it is. */
	const rows = $derived(Math.max(1, bars));

	function nextChoice() {
		const next = CHOICES[(CHOICES.indexOf(bars) + 1) % CHOICES.length];
		prefs.countIn = next > 0;
		if (next > 0) prefs.countInBars = next;
	}

	const label = $derived(
		bars === 0 ? 'Count-in: off' : `Count-in: ${bars} bar${bars > 1 ? 's' : ''}`
	);
</script>

<button
	type="button"
	class="bar-tile ui-button"
	class:ui-button-on={bars > 0}
	style:--beat="{60 / arrangement.bpm}s"
	style:--count={rows * DIGITS.length}
	onclick={nextChoice}
	use:tooltip={TIPS.player.countIn}
>
	<span class="rows" class:two={rows > 1} aria-hidden="true">
		{#each { length: rows }, row (row)}
			<span class="row">
				{#each DIGITS as digit, i (i)}
					<span class="digit" style:--n={row * DIGITS.length + i}>{digit}</span>
				{/each}
			</span>
		{/each}
	</span>
	<span class="tile-label">{label}</span>
</button>

<style>
	.rows {
		display: grid;
		gap: 0.1em;
		font-size: calc(var(--tile-art) * 0.32);
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		color: var(--color-ink);
	}

	/* Two bars: two smaller rows in the same room */
	.rows.two {
		font-size: calc(var(--tile-art) * 0.26);
	}

	:global(.bar-tile.ui-button-on) .rows {
		color: var(--color-accent);
	}

	.digit {
		display: inline-block;
	}

	/* Hovered or tapped (animateKeys.js; not for reduced motion): count in, one digit a beat */
	@media (prefers-reduced-motion: no-preference) {
		:global(.bar-tile[data-animate]) .digit {
			animation: count-one-bar calc(var(--beat) * var(--count)) step-end infinite;
			animation-delay: calc(var(--beat) * var(--n));
			opacity: 0.35;
		}

		:global(.bar-tile[data-animate]) .two .digit {
			animation-name: count-two-bars;
		}
	}

	/* Each digit lit for its own beat, faint for the rest of the count */
	@keyframes count-one-bar {
		0% {
			opacity: 1;
			transform: scale(1.25);
		}
		25% {
			opacity: 0.35;
			transform: scale(1);
		}
	}

	@keyframes count-two-bars {
		0% {
			opacity: 1;
			transform: scale(1.25);
		}
		12.5% {
			opacity: 0.35;
			transform: scale(1);
		}
	}
</style>
