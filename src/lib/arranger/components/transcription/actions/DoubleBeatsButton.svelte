<script>
	/** A beat between every two, for a count at half the song’s speed. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={() => transcription.doubleBeats()}
	use:tooltip={TIPS.transcription.doubleBeats}>Count twice as fast</button
>
