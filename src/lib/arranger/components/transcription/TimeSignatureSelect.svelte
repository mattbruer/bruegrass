<script>
	/**
	 * The song's time signature, once chosen (ChooseTime asks the first time).
	 * Changing it lays the bars out again from bar 1.
	 */
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<label class="flex items-center gap-2">
	<span class="text-sm text-ink-soft">Time</span>
	<select
		class="ui-field px-2 py-1.5"
		value={transcription.time}
		onchange={(event) => transcription.chooseTime(event.currentTarget.value)}
		use:tooltip={TIPS.transcription.time}
	>
		{#each TIME_SIGNATURES as time (time.id)}
			<option value={time.id}>{time.id}</option>
		{/each}
	</select>
</label>
