<script>
	/** Empty the bars Guess filled; chords you wrote or changed stay. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	disabled={!transcription.barsGuessed.length}
	onclick={() => transcription.clearGuesses()}
	use:tooltip={TIPS.transcription.clearGuesses}>Clear guesses</button
>
