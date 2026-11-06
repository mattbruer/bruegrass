<script>
	/** The capo fret (None, 1 … MAX_CAPO). With a melody, moving it asks first (CapoChoiceDialog). */
	import { useArranger } from '../../state/context.js';
	import { CAPO_CHOICES } from '../../chart/capo.js';
	import CapoChoiceDialog from './CapoChoiceDialog.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const arranger = useArranger();
	const { arrangement } = arranger;

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function choose(event) {
		arranger.setCapo(Number(event.currentTarget.value));
		// Shows the capo actually in use until the question is answered
		event.currentTarget.value = String(arrangement.capoFret);
	}
</script>

<label
	class="flex items-center gap-2 font-semibold whitespace-nowrap"
	use:tooltip={TIPS.player.capo}
>
	Capo
	<select value={arrangement.capoFret} onchange={choose} class="w-20 ui-field px-2 py-1">
		{#each CAPO_CHOICES as fret (fret)}
			<option value={fret}>{fret === 0 ? 'None' : fret}</option>
		{/each}
	</select>
</label>

<CapoChoiceDialog />
