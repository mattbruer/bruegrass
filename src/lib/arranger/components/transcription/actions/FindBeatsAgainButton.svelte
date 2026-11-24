<script>
	/** Find the whole recording’s beats again. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={() => transcription.findBeatsAgain()}
	use:tooltip={TIPS.transcription.findAgain}>Find the beats again</button
>
