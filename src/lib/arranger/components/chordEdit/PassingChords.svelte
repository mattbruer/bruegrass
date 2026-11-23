<script>
	/**
	 * Passing chords for the approach notes under this chord
	 * (chart/passingChordSuggestions.js): each on the beat its note starts,
	 * leading into the next chord. Add writes it into the bar; the harmony
	 * parts then ask before they follow (state/HarmonyFollowState.svelte.js).
	 */
	import { useArranger } from '../../state/context.js';
	import { passingChordSuggestions } from '../../chart/passingChordSuggestions.js';
	import { MELODY_CHANNEL } from '../../melody/harmony/partChannels.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   place: import('../../chart/chartAnalysis.js').ChordPlace,
	 *   onAdded: () => void
	 * }}
	 */
	let { place, onAdded } = $props();

	const { arrangement, melody } = useArranger();

	const options = $derived(
		arrangement.isPlayable && melody.line
			? passingChordSuggestions(
					arrangement.sections,
					melody.line.notes.filter((note) => note.channel === MELODY_CHANNEL),
					place,
					arrangement.capoFret
				)
			: []
	);

	/** @param {import('../../chart/passingChordSuggestions.js').PassingSuggestion} option */
	function add(option) {
		arrangement.addPassingChord(place, option);
		onAdded();
	}
</script>

{#if options.length > 0}
	<section class="flex flex-col gap-2">
		<h3 class="font-semibold">Passing chords</h3>
		<ul class="flex flex-col gap-1.5">
			{#each options as option (`${option.beat}-${option.name}`)}
				<li class="flex items-center gap-3">
					<button
						type="button"
						class="shrink-0 ui-button px-2.5 py-1 text-sm"
						onclick={() => add(option)}
						use:tooltip={TIPS.chordEdit.passing}
					>
						Add {option.name}
					</button>
					<span class="text-sm text-ink-soft">
						on beat {option.beat + 1}, into {option.leadsTo} ({option.ways.join(', ')}); the
						melody's {option.note} is {option.role === 'tone' ? 'in it' : 'a tension of it'}
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}
