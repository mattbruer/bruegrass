<script>
	/** Turns the tiny per-note variation (instruments/roundRobin.js) on and off, even mid-strum. */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<button
	type="button"
	class="ui-button px-4 py-2"
	class:ui-button-on={settings.varyNotes}
	aria-pressed={settings.varyNotes}
	onclick={() => (settings.varyNotes = !settings.varyNotes)}
	use:tooltip={TIPS.player.varyNotes}
>
	Vary
</button>
