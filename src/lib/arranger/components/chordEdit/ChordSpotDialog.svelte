<script>
	/**
	 * Tapping a spot on the strip where no chord is written (a bar holding the
	 * chord before, the second half of a bar) opens this: put a chord there,
	 * typed or picked from the chords that fit the melody. It lasts until the
	 * bar's next chord (chart/withChordFrom.js).
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { chordBoxProblem } from '../../chart/knownChords.js';
	import { slotPositions } from '../../chart/timeline.js';
	import ChordsThatFit from './ChordsThatFit.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ spot: import('../../chart/chordSpot.js').ChordSpot | null }} */
	let { spot = $bindable() } = $props();

	const { arrangement } = useArranger();

	/** The chord sounding there now, and the bar's name. */
	let here = $derived(spot ? describe(spot) : null);
	/** What's in the box: empty for each new spot. */
	let typed = $derived(spot ? '' : '');
	let problem = $derived(chordBoxProblem(typed));

	/** @param {import('../../chart/chordSpot.js').ChordSpot} at */
	function describe(at) {
		const slot = slotPositions(arrangement.sections).find(
			(each) =>
				each.section === at.section &&
				each.measure === at.measure &&
				each.start - each.barStart <= at.beat &&
				at.beat < each.start - each.barStart + each.length
		);
		const section = arrangement.sections[at.section]?.name;
		const where = `${section ? `${section}, ` : ''}bar ${at.measure + 1}, beat ${at.beat + 1}`;
		return { where, sounding: slot?.name ?? '' };
	}

	/** @param {SubmitEvent} event */
	function save(event) {
		event.preventDefault();
		if (!spot || problem || !typed.trim()) return;
		arrangement.setChordFrom(spot, typed.trim());
		spot = null;
	}
</script>

<Dialog
	bind:open={() => spot !== null, (isOpen) => !isOpen && (spot = null)}
	title={here?.where ?? ''}
>
	{#if spot && here}
		<form class="flex max-w-md flex-col gap-4 px-6 pt-4 pb-6" onsubmit={save}>
			{#if here.sounding}
				<p class="text-sm text-ink-soft">
					{here.sounding} carries on here. Put a chord here instead:
				</p>
			{/if}
			<label class="flex flex-col gap-2">
				<span class="font-semibold">Chord</span>
				<input
					class="ui-field px-3 py-2 text-lg"
					bind:value={typed}
					aria-invalid={problem ? 'true' : undefined}
					autocapitalize="off"
					autocomplete="off"
					spellcheck="false"
					use:tooltip={TIPS.chordEdit.spotName}
				/>
			</label>

			{#if problem}
				<p class="text-sm text-danger">{problem}</p>
			{/if}

			<ChordsThatFit {spot} picked={typed} onPick={(name) => (typed = name)} />

			<div class="flex flex-wrap gap-2">
				<button
					type="submit"
					class="ui-button-on px-4 py-2 font-semibold"
					disabled={problem !== '' || !typed.trim()}
					use:tooltip={TIPS.chordEdit.put}
				>
					Put it here
				</button>
			</div>
		</form>
	{/if}
</Dialog>
