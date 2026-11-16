<script>
	/**
	 * The picked TAB note's fret and string, to change by hand: a fret field
	 * (a phone shows its number pad) and the string above or below. The
	 * keyboard does the same on the number itself (TabStrip.svelte).
	 */
	import { stringToward } from '../../tab/fingering.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   tabNote: import('../../tab/fingering.js').TabNote & { place: import('../../tab/fingering.js').Place },
	 *   board: import('../../tab/fretboards.js').Fretboard,
	 *   onFret: (tabNote: import('../../tab/fingering.js').TabNote, fret: number) => void,
	 *   onString: (tabNote: import('../../tab/fingering.js').TabNote, direction: -1 | 1) => void
	 * }}
	 */
	let { tabNote, board, onFret, onString } = $props();

	const stringName = $derived(board.strings[tabNote.place.string].name);

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function typedFret(event) {
		const fret = Number(event.currentTarget.value);
		if (event.currentTarget.value !== '' && Number.isInteger(fret)) onFret(tabNote, fret);
		event.currentTarget.value = String(tabNote.place.fret); // a fret the string hasn't stays as it was
	}
</script>

<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
	<label class="flex items-center gap-1.5">
		<span class="text-ink-soft">Fret</span>
		<input
			class="w-16 ui-field px-2 py-1 tabular-nums"
			type="number"
			inputmode="numeric"
			min="0"
			max={board.frets}
			value={tabNote.place.fret}
			onchange={typedFret}
			use:tooltip={TIPS.melody.tabFretField}
		/>
	</label>
	<span class="text-ink-soft">on the {stringName} string</span>
	<button
		type="button"
		class="ui-button px-3 py-1"
		disabled={stringToward(tabNote, -1) === null}
		onclick={() => onString(tabNote, -1)}
		use:tooltip={TIPS.melody.tabStringUp}>↑ String</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1"
		disabled={stringToward(tabNote, 1) === null}
		onclick={() => onString(tabNote, 1)}
		use:tooltip={TIPS.melody.tabStringDown}>↓ String</button
	>
</div>
