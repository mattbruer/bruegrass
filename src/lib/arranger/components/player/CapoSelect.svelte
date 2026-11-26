<script>
	/** The guitar's capo (None, 1 … MAX_CAPO). It changes only the shapes the guitar plays, never the sound. */
	import { useArranger } from '../../state/context.js';
	import { CAPO_CHOICES } from '../../chart/capo.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement } = useArranger();
</script>

<label
	class="flex items-center gap-2 font-semibold whitespace-nowrap"
	use:tooltip={TIPS.player.capo}
>
	Capo
	<select
		value={arrangement.capoFret}
		onchange={(event) => (arrangement.capo = Number(event.currentTarget.value))}
		class="ui-field px-2 py-1"
	>
		{#each CAPO_CHOICES as fret (fret)}
			<option value={fret}>{fret === 0 ? 'None' : fret}</option>
		{/each}
	</select>
</label>
