<script>
	/**
	 * The song's key, as the transcription names it (written into the chart as
	 * `[K:]`, and the tune and bass respelled). Needed before sending to the arranger.
	 */
	import { songKeyChoices } from '../../chart/keyChoices.js';
	import SongKeyOptions from '../chart/SongKeyOptions.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const NOT_NAMED = '';
	const keyChoices = $derived(songKeyChoices(transcription.arranger.arrangement.capoFret));
</script>

<label class="flex items-center gap-2">
	<span class="text-sm text-ink-soft">Key</span>
	<select
		class="ui-field px-2 py-1.5"
		value={transcription.key ?? NOT_NAMED}
		onchange={(event) => transcription.setKey(event.currentTarget.value || null)}
		use:tooltip={TIPS.transcription.key}
	>
		<option value={NOT_NAMED}>Not known yet</option>
		<SongKeyOptions choices={keyChoices} />
	</select>
</label>
