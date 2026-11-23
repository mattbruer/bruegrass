<script>
	/**
	 * Tapping a chord on the strip opens this: change its name, and the chart
	 * is rewritten where the chord is written, or pick one of the chords that
	 * fit the melody there. "Learn" hands the same chord to the chord tutor.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { placeId } from '../../chart/chartAnalysis.js';
	import { chordBoxProblem } from '../../chart/knownChords.js';
	import ChordsThatFit from './ChordsThatFit.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   place: import('../../chart/chartAnalysis.js').ChordPlace | null,
	 *   onLearn: (place: import('../../chart/chartAnalysis.js').ChordPlace) => void
	 * }}
	 */
	let { place = $bindable(), onLearn } = $props();

	const { arrangement } = useArranger();

	let found = $derived(place ? arrangement.analysis.get(placeId(place)) : undefined);
	/** What's in the box: the chord as written, until you type over it (each new chord starts afresh). */
	let typed = $derived(place && found ? found.name : '');
	let problem = $derived(chordBoxProblem(typed));
	let unchanged = $derived(!found || typed.trim() === found.name);

	/** @param {SubmitEvent} event */
	function save(event) {
		event.preventDefault();
		if (!place || problem || unchanged) return;
		arrangement.changeChord(place, typed.trim());
		place = null;
	}
</script>

<Dialog
	bind:open={() => place !== null, (isOpen) => !isOpen && (place = null)}
	title={found ? found.name : ''}
>
	{#if place && found}
		<form class="flex max-w-md flex-col gap-4 px-6 pt-4 pb-6" onsubmit={save}>
			<label class="flex flex-col gap-2">
				<span class="font-semibold">Chord</span>
				<input
					class="ui-field px-3 py-2 text-lg"
					bind:value={typed}
					aria-invalid={problem ? 'true' : undefined}
					autocapitalize="off"
					autocomplete="off"
					spellcheck="false"
					onfocus={(event) => event.currentTarget.select()}
					use:tooltip={TIPS.chordEdit.name}
				/>
			</label>

			{#if problem}
				<p class="text-sm text-danger">{problem}</p>
			{/if}

			<ChordsThatFit {place} picked={typed} onPick={(name) => (typed = name)} />

			<div class="flex flex-wrap gap-2">
				<button
					type="submit"
					class="ui-button-on px-4 py-2 font-semibold"
					disabled={problem !== '' || unchanged}
					use:tooltip={TIPS.chordEdit.save}
				>
					Change
				</button>
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => onLearn(place)}
					use:tooltip={TIPS.chordEdit.learn}
				>
					Learn about it
				</button>
			</div>
		</form>
	{/if}
</Dialog>
