<script>
	/** Make an added lane the song’s bass line. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string, lane: import('../../../tracks/lanes.js').BandLane }} */
	let { transcription, class: className = '', lane } = $props();
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={() => transcription.useLaneAsBass(lane.id)}
	use:tooltip={TIPS.transcription.laneBass}>Make it the bass line</button
>
