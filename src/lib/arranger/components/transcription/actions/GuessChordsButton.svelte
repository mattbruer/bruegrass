<script>
	/** Fill the empty bars with chords guessed from the recording (chords you typed stay). Never runs on its own: working chords out by ear is still the practice. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	disabled={!transcription.audio}
	onclick={() => transcription.guessChords()}
	use:tooltip={TIPS.transcription.guessChords}>Guess the chords</button
>
