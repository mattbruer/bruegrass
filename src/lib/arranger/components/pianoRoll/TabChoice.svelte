<script>
	/** Which instrument a part's TAB is written for (None: no TAB). */
	import { FRETBOARDS } from '../../tab/fretboards.js';
	import { setTabInstrument, songTab } from '../../tab/songTab.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ voice: string }} */
	let { voice } = $props();

	const NONE = '';
</script>

<label class="flex items-center gap-1.5 text-sm">
	<span class="text-ink-soft">TAB</span>
	<select
		class="ui-field px-2 py-1"
		value={songTab.parts[voice]?.instrument ?? NONE}
		onchange={(event) => setTabInstrument(voice, event.currentTarget.value || null)}
		use:tooltip={TIPS.melody.tabInstrument}
	>
		<option value={NONE}>None</option>
		{#each FRETBOARDS as board (board.id)}
			<option value={board.id}>{board.name}</option>
		{/each}
	</select>
</label>
