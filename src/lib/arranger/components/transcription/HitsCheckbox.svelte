<script>
	/** Show the recording's hits (where each pick or strum starts) over its waveform. */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<label
	class="flex items-center gap-1 text-xs text-ink-soft"
	use:tooltip={TIPS.transcription.showHits}
>
	<input type="checkbox" class="accent-accent" bind:checked={settings.transcribe.showHits} />
	Hits
</label>
