<script>
	/**
	 * Guess the chords: fills every bar that has no chord yet with a guess
	 * from the recording, to fix by ear. Never runs on its own (the user's
	 * call: working chords out by ear is still the practice).
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<button
	type="button"
	class="ui-button px-1.5 text-xs"
	disabled={!transcription.audio || !transcription.linked}
	onclick={() => transcription.guessChords()}
	use:tooltip={TIPS.transcription.guessChords}>Guess</button
>
