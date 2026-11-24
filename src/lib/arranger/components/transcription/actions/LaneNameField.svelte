<script>
	/** A name of your own for a part's lane (a blank one keeps the name it had). */
	import { PART_NAME_LENGTH, ownName } from '../../../melody/partNames.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../../transcription/TranscriptionState.svelte.js').TranscriptionState, lane: import('../../../tracks/lanes.js').BandLane }} */
	let { transcription, lane } = $props();

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function rename(event) {
		transcription.renameLane(lane.id, event.currentTarget.value);
		event.currentTarget.value = transcription.laneName(lane.id); // a refused blank shows the name kept
	}
</script>

<label class="flex flex-col gap-1 text-sm">
	<span class="ui-menu-heading">Name</span>
	<input
		class="ui-field px-2 py-1"
		value={transcription.laneName(lane.id)}
		placeholder={ownName(lane.id)}
		maxlength={PART_NAME_LENGTH}
		onchange={rename}
		onkeydown={(event) => {
			if (event.key === 'Enter') event.currentTarget.blur();
		}}
		use:tooltip={TIPS.transcription.laneName}
	/>
</label>
