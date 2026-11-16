<script>
	/**
	 * Opens Transcribe for a song written from a recording (most songs have
	 * none, so most don't show it). A new transcription starts from the song
	 * bar's "New from…" menu.
	 */
	import { resolve } from '$app/paths';
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { song } = useArranger();
</script>

{#if song.recording}
	<a
		href={resolve('/arranger/transcribe')}
		class="ui-button px-4 py-2 text-sm"
		use:tooltip={TIPS.transcription.open}
	>
		Transcribe
	</a>
{/if}
