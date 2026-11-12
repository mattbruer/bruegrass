<script>
	/**
	 * One chord's function: the worked-out reading and why, the other
	 * readings a musician might give, and your own. Picking or typing one
	 * writes it into the chart after the chord (`A7{V7/V}`); the worked-out
	 * reading clears it.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { placeId } from '../../chart/chartAnalysis.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ place: import('../../chart/chartAnalysis.js').ChordPlace | null }} */
	let { place = $bindable() } = $props();

	const { arrangement } = useArranger();

	let found = $derived(place ? arrangement.analysis.get(placeId(place)) : undefined);
	let shown = $derived(found ? (found.mark ?? found.label) : '');
	/** What's in the box: your mark, until you type over it. */
	let typed = $derived(found?.mark ?? '');

	/** @param {string | null} mark */
	function use(mark) {
		if (!place || !found) return;
		arrangement.markChord(place, mark === found.label ? null : mark);
	}

	function useTyped() {
		use(typed.trim() || null);
	}
</script>

<Dialog
	bind:open={() => place !== null, (isOpen) => !isOpen && (place = null)}
	title={found ? `${found.name}: ${shown}` : 'Chord'}
>
	{#if found}
		<div class="flex max-w-md flex-col gap-4 px-6 pt-4 pb-6">
			<p class="text-sm">
				Worked out: <strong>{found.label}</strong>. {found.why}
			</p>

			<div class="flex flex-wrap gap-2" role="group" aria-label="Readings">
				{#each found.options as option (option)}
					<button
						type="button"
						class="ui-button px-3 py-2 font-semibold"
						class:ui-button-on={option === shown}
						aria-pressed={option === shown}
						onclick={() => use(option)}
						use:tooltip={option === found.label
							? TIPS.chordFunction.workedOut
							: TIPS.chordFunction.option}
					>
						{option}
					</button>
				{/each}
			</div>

			<form
				class="flex gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					useTyped();
				}}
			>
				<input
					class="min-w-0 flex-1 ui-field px-3 py-2"
					bind:value={typed}
					placeholder="Your own, e.g. V7/IV"
					aria-label="Your own reading"
					autocapitalize="off"
					autocomplete="off"
					spellcheck="false"
				/>
				<button type="submit" class="ui-button px-3 py-2" use:tooltip={TIPS.chordFunction.useTyped}>
					Use
				</button>
			</form>

			{#if found.mark}
				<button
					type="button"
					class="self-start ui-button px-3 py-2"
					onclick={() => use(null)}
					use:tooltip={TIPS.chordFunction.reset}
				>
					Back to {found.label}
				</button>
			{/if}

			<p class="text-xs text-ink-soft">
				Your reading is written in the chart after the chord, like A7&#123;V7/V&#125;. The band
				ignores it.
			</p>
		</div>
	{/if}
</Dialog>
