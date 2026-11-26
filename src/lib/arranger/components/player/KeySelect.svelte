<script>
	/** Move the whole band to another key (for a singer). The guitar starts again with no capo. */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement } = useArranger();
</script>

<label
	class="flex items-center gap-2 font-semibold whitespace-nowrap"
	use:tooltip={TIPS.player.key}
>
	Key
	<select
		value={arrangement.transpose}
		onchange={(event) => arrangement.setKey(Number(event.currentTarget.value))}
		disabled={arrangement.keyChoices.length === 0}
		class="w-36 ui-field px-2 py-1"
	>
		{#each arrangement.keyChoices as choice (choice.transpose)}
			<option value={choice.transpose}>{choice.name}</option>
		{/each}
	</select>
</label>
