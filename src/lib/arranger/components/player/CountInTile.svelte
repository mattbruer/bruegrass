<script>
	/**
	 * Count-in on or off, beside the metronome like Logic's: a key that says
	 * 1234, lit while on. On, Play clicks a bar or two before the band comes
	 * in (recording always counts in; the record panel sets how many bars).
	 */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const prefs = settings.metronome;
</script>

<button
	type="button"
	class="bar-tile ui-button"
	class:ui-button-on={prefs.countIn}
	aria-pressed={prefs.countIn}
	onclick={() => (prefs.countIn = !prefs.countIn)}
	use:tooltip={TIPS.player.countIn}
>
	<span class="count" aria-hidden="true">1234</span>
	<span class="tile-label">Count-in</span>
</button>

<style>
	.count {
		font-size: calc(var(--tile-art) * 0.32);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		color: var(--color-ink);
	}

	button[aria-pressed='true'] .count {
		color: var(--color-accent);
	}
</style>
