<script>
	/** The capo fret (None, 1 … MAX_CAPO). */
	import { useArranger } from '../../state/context.js';
	import { CAPO_CHOICES } from '../../chart/capo.js';

	const { arrangement } = useArranger();
</script>

<label class="flex items-center gap-2 font-semibold whitespace-nowrap">
	Capo
	<select bind:value={arrangement.capo} class="w-20 ui-field px-2 py-1">
		{#each CAPO_CHOICES as fret (fret)}
			<option value={fret}>{fret === 0 ? 'None' : fret}</option>
		{/each}
	</select>
</label>
