<script>
	/** Move the whole band to another key (for a singer). */
	import { useArranger } from '../../state/context.js';

	const { arrangement } = useArranger();
</script>

<label class="flex items-center gap-2 font-semibold whitespace-nowrap">
	Key
	<select
		bind:value={arrangement.transpose}
		disabled={arrangement.keyChoices.length === 0}
		class="w-36 ui-field px-2 py-1"
	>
		{#each arrangement.keyChoices as choice (choice.transpose)}
			<option value={choice.transpose}>{choice.name}</option>
		{/each}
	</select>
</label>
