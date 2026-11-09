<script>
	/** Start a new song from one of the examples (exampleSongs.js). */
	import { useArranger } from '../../state/context.js';
	import { okToDiscardChanges } from '../../state/guardUnsavedChanges.svelte.js';
	import { EXAMPLE_SONGS } from '../../exampleSongs.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { song } = useArranger();

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function startFromExample(event) {
		const example = EXAMPLE_SONGS.find(({ id }) => id === event.currentTarget.value);
		event.currentTarget.value = ''; // the menu always shows "Examples"
		if (example && okToDiscardChanges(song)) song.startNew(example.song, example.name);
	}
</script>

<select
	class="ui-field px-3 py-2"
	style="width: auto"
	aria-label="Start from an example song"
	onchange={startFromExample}
	use:tooltip={TIPS.song.examples}
>
	<option value="">Examples…</option>
	{#each EXAMPLE_SONGS as example (example.id)}
		<option value={example.id}>{example.title}</option>
	{/each}
</select>
