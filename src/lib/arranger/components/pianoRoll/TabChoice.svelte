<script>
	/** Which instrument a part's TAB is written for. */
	import { FRETBOARDS } from '../../tab/fretboards.js';
	import { setTabInstrument } from '../../tab/songTab.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ voice: string, instrument: string }} instrument: the one shown (the chosen one, or the default) */
	let { voice, instrument } = $props();
</script>

<label class="flex items-center gap-1.5 text-sm">
	<span class="text-ink-soft">TAB for</span>
	<select
		class="ui-field px-2 py-1"
		value={instrument}
		onchange={(event) => setTabInstrument(voice, event.currentTarget.value)}
		use:tooltip={TIPS.melody.tabInstrument}
	>
		{#each FRETBOARDS as board (board.id)}
			<option value={board.id}>{board.name}</option>
		{/each}
	</select>
</label>
