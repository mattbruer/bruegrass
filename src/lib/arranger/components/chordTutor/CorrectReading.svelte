<script>
	/**
	 * When the worked-out reading of a chord is wrong: the other readings a
	 * musician might give, and your own. Picking or typing one writes it into
	 * the chart after the chord (`A7{V7/V}`); the worked-out reading clears it.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   place: import('../../chart/chartAnalysis.js').ChordPlace,
	 *   found: import('../../chart/chartAnalysis.js').ChordAnalysis
	 * }}
	 */
	let { place, found } = $props();

	const { arrangement } = useArranger();

	let shown = $derived(found.mark ?? found.label);
	/** What's in the box: your mark, until you type over it. */
	let typed = $derived(found.mark ?? '');

	/** @param {string | null} mark */
	function use(mark) {
		arrangement.markChord(place, mark === found.label ? null : mark);
	}
</script>

<div class="flex flex-col gap-3">
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
			use(typed.trim() || null);
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
		Your reading is written in the chart after the chord, like A7&#123;V7/V&#125;. The band ignores
		it.
	</p>
</div>
