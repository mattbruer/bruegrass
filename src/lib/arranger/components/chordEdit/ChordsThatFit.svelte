<script>
	/**
	 * Every chord that fits the melody on a spot of the chart (chart/chordSuggestions.js):
	 * the bluegrass ones first, the jazzier ones behind a button. Tapping one
	 * hands it to the host (to put in the chord box); under them, why the
	 * chord in the box fits or doesn't, note by note (ChordBreakdown).
	 */
	import { useArranger } from '../../state/context.js';
	import { chordSuggestions } from '../../chart/chordSuggestions.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import ChordBreakdown from './ChordBreakdown.svelte';
	import StrongBeatsChoice from './StrongBeatsChoice.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   spot: import('../../chart/chordSpot.js').ChordSpot,
	 *   picked: string,
	 *   onPick: (name: string) => void
	 * }}
	 */
	let { spot, picked, onPick } = $props();

	const { arrangement, melody } = useArranger();

	const suggestions = $derived(
		arrangement.isPlayable && melody.line
			? chordSuggestions(
					arrangement.sections,
					melody.line.notes.filter((note) => note.channel === MELODY_CHANNEL),
					spot,
					arrangement.capoFret,
					settings.chords.strongBeats
				)
			: []
	);
	const bluegrass = $derived(suggestions.filter((each) => each.bluegrass));
	const jazzier = $derived(suggestions.filter((each) => !each.bluegrass));
	/** The chord to explain: the one in the box, else the one there now. */
	const explained = $derived(
		picked.trim() || (suggestions.find((each) => each.current)?.name ?? '')
	);
	let showJazzier = $state(false);
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
		<StrongBeatsChoice />
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
		{/if}
		<ChordBreakdown {spot} name={explained} />
	</section>
{/if}
