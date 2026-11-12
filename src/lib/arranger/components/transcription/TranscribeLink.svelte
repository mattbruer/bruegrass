<script>
	/** Opens Transcribe: write a song down from a recording, in a track grid with a piano roll. */
	import { resolve } from '$app/paths';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<a
	href={resolve('/arranger/transcribe')}
	class="ui-button px-4 py-2 text-sm"
	use:tooltip={TIPS.transcription.open}
>
	Transcribe
</a>
