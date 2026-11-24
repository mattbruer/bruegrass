<script>
	/** Empty every bar’s chords, typed ones too. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	disabled={!transcription.hasChords}
	onclick={() => transcription.clearChords()}
	use:tooltip={TIPS.transcription.clearChords}>Clear chords</button
>
