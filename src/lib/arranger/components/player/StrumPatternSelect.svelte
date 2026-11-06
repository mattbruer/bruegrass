<script>
	/** Audition one strum pattern at a time, or play the usual mix. */
	import { useArranger } from '../../state/context.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { STRUM_PATTERNS } from '../../instruments/strumPatterns.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { player } = useArranger();
</script>

<label
	class="flex items-center gap-2 font-semibold whitespace-nowrap"
	use:tooltip={TIPS.player.strumPattern}
>
	Strum
	<select
		bind:value={settings.strumPattern}
		onchange={() => player.restartIfPlaying()}
		class="ui-field px-2 py-1"
	>
		<option value="mix">Mix</option>
		{#each Object.entries(STRUM_PATTERNS) as [name, pattern] (name)}
			<option value={name}>{pattern.label}</option>
		{/each}
	</select>
</label>
