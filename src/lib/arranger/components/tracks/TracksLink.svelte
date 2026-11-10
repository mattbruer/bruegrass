<script>
	/** Opens the song as tracks, like a DAW, with your takes as waveforms. The song and the band come too. */
	import { resolve } from '$app/paths';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<a
	href={resolve('/arranger/tracks')}
	class="ui-button px-4 py-2 text-sm"
	use:tooltip={TIPS.tracks.open}
>
	Tracks
</a>
