<script>
	/**
	 * Above the piano roll: how finely notes snap, the song's key, and
	 * deleting the picked note.
	 */
	import { useArranger } from '../../state/context.js';
	import { GRIDS } from '../../melody/roll/ticks.js';
	import { songKeyChoices } from '../../chart/keyChoices.js';
	import { guessedKey, keyName } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ drawing: import('../../melody/roll/MelodyDrawing.svelte.js').MelodyDrawing }} */
	let { drawing } = $props();

	const arranger = useArranger();
	const { arrangement } = arranger;

	const GUESS = '';
	let named = $derived(arrangement.sections[0]?.key ?? null);
	let guess = $derived(guessedKey(arrangement.sections));
	let choices = $derived(songKeyChoices(arrangement.capoFret));
	let guessName = $derived(
		guess
			? (choices.find((choice) => choice.value === keyName(guess))?.name ?? keyName(guess))
			: '?'
	);

	/** @param {Event} event */
	function chooseKey(event) {
		const value = /** @type {HTMLSelectElement} */ (event.currentTarget).value;
		arranger.nameSongKey(value === GUESS ? null : value);
	}

	function deleteSelected() {
		const index = drawing.selected;
		drawing.selected = -1;
		drawing.commit(drawing.notes.filter((_, i) => i !== index));
	}
</script>

<div class="mb-2 flex flex-wrap items-center gap-2 text-sm">
	<div class="flex gap-1" role="group" aria-label="Note lengths">
		{#each GRIDS as grid (grid.id)}
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				class:ui-button-on={drawing.grid === grid.id}
				aria-pressed={drawing.grid === grid.id}
				onclick={() => drawing.setGrid(grid.id)}
				use:tooltip={TIPS.melody.roll.grids[grid.id]}>{grid.name}</button
			>
		{/each}
	</div>

	<label class="flex items-center gap-1.5">
		<span class="text-ink-soft">Key</span>
		<select
			class="ui-field px-2 py-1.5"
			value={named ? keyName(named) : GUESS}
			onchange={chooseKey}
			disabled={!arrangement.isPlayable}
			use:tooltip={TIPS.melody.roll.key}
		>
			<option value={GUESS}>{guessName}, from the first chord</option>
			{#each choices as choice (choice.value)}
				<option value={choice.value}>{choice.name}</option>
			{/each}
		</select>
	</label>

	<button
		type="button"
		class="ui-button px-3 py-1.5"
		disabled={drawing.selected < 0 || drawing.problem !== ''}
		onclick={deleteSelected}
		use:tooltip={TIPS.melody.roll.delete}>Delete note</button
	>
</div>
