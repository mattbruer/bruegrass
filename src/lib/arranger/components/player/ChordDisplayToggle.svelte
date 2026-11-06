<script>
	/**
	 * How chords are shown: guitar shapes, concert, Roman or Nashville.
	 * A preference, so it's saved with the settings.
	 */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { CHORD_DISPLAYS } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<!-- A sunk well with the chosen option raised -->
<div
	class="flex ui-well rounded-[var(--corner-control)] p-0.5"
	role="group"
	aria-label="Show chords as"
>
	{#each CHORD_DISPLAYS as display (display.id)}
		{@const chosen = settings.chordDisplay === display.id}
		<button
			type="button"
			class="rounded-[var(--corner-control)] px-1.5 py-1 text-sm font-semibold sm:px-3"
			class:ui-button={chosen}
			class:text-accent={chosen}
			class:text-ink-soft={!chosen}
			aria-pressed={chosen}
			onclick={() => (settings.chordDisplay = display.id)}
			use:tooltip={TIPS.player.chordDisplay[display.id]}
		>
			{display.name}
		</button>
	{/each}
</div>
