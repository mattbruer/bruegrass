<script>
	/** Every other beat, for a count at twice the song’s speed. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={() => transcription.halveBeats()}
	use:tooltip={TIPS.transcription.halveBeats}>Count half as fast</button
>
