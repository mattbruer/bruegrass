<script>
	/** Drop the edited bass line and go back to the band's own, written from the chart. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={() => transcription.arranger.bass.rewriteFromChart()}
	use:tooltip={TIPS.transcription.useBandsBass}>Use the band’s own bass line</button
>
