<script>
	/**
	 * Every chord that fits the melody under this one (chart/chordSuggestions.js):
	 * the bluegrass ones first, the jazzier ones behind a button. Tapping one
	 * hands it to the host (to put in the chord box) and says why it fits.
	 */
	import { useArranger } from '../../state/context.js';
	import { chordSuggestions } from '../../chart/chordSuggestions.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   place: import('../../chart/chartAnalysis.js').ChordPlace,
	 *   picked: string,
	 *   onPick: (name: string) => void
	 * }}
	 */
	let { place, picked, onPick } = $props();

	const { arrangement, melody } = useArranger();

	const suggestions = $derived(
		arrangement.isPlayable && melody.line
			? chordSuggestions(
					arrangement.sections,
					melody.line.notes.filter((note) => note.channel === MELODY_CHANNEL),
					place,
					arrangement.capoFret
				)
			: []
	);
	const bluegrass = $derived(suggestions.filter((each) => each.bluegrass));
	const jazzier = $derived(suggestions.filter((each) => !each.bluegrass));
	const chosen = $derived(suggestions.find((each) => each.name === picked.trim()));
	let showJazzier = $state(false);

	/** @param {import('../../chart/chordSuggestions.js').Suggestion} suggestion */
	function why(suggestion) {
		const notes = suggestion.targets.map((target) => `${target.note} is its ${target.as}`);
		return `${notes.join(', ')}. ${suggestion.does}, ${suggestion.scale}.`;
	}
</script>

{#snippet chips(/** @type {typeof suggestions} */ list)}
	<div class="flex flex-wrap gap-1.5">
		{#each list as suggestion (suggestion.name)}
			<button
				type="button"
				class="ui-button px-2.5 py-1 text-sm"
				class:ui-button-on={suggestion.name === picked.trim()}
				aria-pressed={suggestion.name === picked.trim()}
				onclick={() => onPick(suggestion.name)}
				use:tooltip={TIPS.chordEdit.fits}
			>
				{suggestion.name}{suggestion.current ? ' (now)' : ''}
			</button>
		{/each}
	</div>
{/snippet}

{#if melody.line}
	<section class="flex flex-col gap-2">
		<h3 class="font-semibold">Chords that fit the melody here</h3>
		{#if suggestions.length === 0}
			<p class="text-sm text-ink-soft">No melody plays under this chord.</p>
		{:else}
			{@render chips(bluegrass)}
			{#if jazzier.length > 0}
				<button
					type="button"
					class="self-start ui-button px-2.5 py-1 text-sm"
					aria-expanded={showJazzier}
					onclick={() => (showJazzier = !showJazzier)}
					use:tooltip={TIPS.chordEdit.jazzier}
				>
					{showJazzier ? 'Hide' : 'Show'} jazzier chords ({jazzier.length})
				</button>
				{#if showJazzier}
					{@render chips(jazzier)}
				{/if}
			{/if}
			{#if chosen}
				<p class="text-sm text-ink-soft">{why(chosen)}</p>
			{/if}
		{/if}
	</section>
{/if}
