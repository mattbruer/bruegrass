<script>
	/**
	 * The options of a menu naming the song's key: every key, in a Major
	 * and a Minor group (keyChoices.js), each from C up.
	 */
	import { KEY_GROUPS } from '../../chart/keyChoices.js';

	/** @type {{ choices: { group: string, value: string, name: string }[] }} */
	let { choices } = $props();
</script>

{#each KEY_GROUPS as group (group.name)}
	<optgroup label={group.name}>
		{#each choices.filter((choice) => choice.group === group.name) as choice (choice.value)}
			<option value={choice.value}>{choice.name}</option>
		{/each}
	</optgroup>
{/each}
