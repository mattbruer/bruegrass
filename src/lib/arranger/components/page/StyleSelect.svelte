<script>
	/** The band's style for this song (Bluegrass, Celtic…). The host decides where it sits. */
	import { useArranger } from '../../state/context.js';
	import { STYLES } from '../../styles/styles.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement } = useArranger();
</script>

<label class="flex flex-col gap-1 text-sm" use:tooltip={TIPS.transcription.bandStyle}>
	<span class="heading">Style</span>
	<select class="ui-field px-2 py-1" bind:value={arrangement.style}>
		{#each STYLES as style (style.id)}
			<option value={style.id}>{style.name}</option>
		{/each}
	</select>
</label>

<style>
	.heading {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
