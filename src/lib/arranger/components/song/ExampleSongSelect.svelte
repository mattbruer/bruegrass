<script>
	/**
	 * "New from…": a new song from one of the examples (exampleSongs.js), or
	 * from a recording, written down in Transcribe.
	 */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useArranger } from '../../state/context.js';
	import { EXAMPLE_SONGS } from '../../exampleSongs.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const FROM_A_RECORDING = 'recording';

	const { song } = useArranger();

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function startFrom(event) {
		const choice = event.currentTarget.value;
		event.currentTarget.value = ''; // the menu always shows "New from…"
		if (choice === FROM_A_RECORDING) {
			song.startNew();
			goto(resolve('/arranger/transcribe'));
			return;
		}
		const example = EXAMPLE_SONGS.find(({ id }) => id === choice);
		if (example) song.startNew(example.song, example.name);
	}
</script>

<select
	class="ui-field px-3 py-2"
	style="width: auto"
	aria-label="Start a new song from an example or a recording"
	onchange={startFrom}
	use:tooltip={TIPS.song.examples}
>
	<option value="">New from…</option>
	<optgroup label="Examples">
		{#each EXAMPLE_SONGS as example (example.id)}
			<option value={example.id}>{example.title}</option>
		{/each}
	</optgroup>
	<option value={FROM_A_RECORDING}>A recording (transcribe it)…</option>
</select>
