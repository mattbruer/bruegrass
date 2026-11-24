<script>
	/** Take an added lane away, asking first if it has notes. Styled by where it sits (class). */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string, lane: import('../../../tracks/lanes.js').BandLane }} */
	let { transcription, class: className = '', lane } = $props();

	function remove() {
		const sure = lane.blocks.length === 0 || confirm(`Take “${lane.name}” away, with its notes?`);
		if (sure) transcription.removeLane(lane.id);
	}
</script>

<button
	type="button"
	class="ui-button {className}"
	onclick={remove}
	use:tooltip={TIPS.transcription.laneRemove}>Remove lane</button
>
