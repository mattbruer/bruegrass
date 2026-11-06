<script>
	/**
	 * Choose what loops: the whole arrangement, one section, or a range of
	 * bars. The bar is pressed in and lit while only part is chosen, so it's
	 * obvious only part of the song will play. Changes take effect at once,
	 * even while playing.
	 */
	import { useArranger } from '../../state/context.js';
	import { WHOLE_ARRANGEMENT } from '../../state/LoopState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement, loop, player } = useArranger();

	function chooseSection() {
		loop.useAllBarsOfSection();
		player.restartIfPlaying();
	}

	function chooseLastBar(/** @type {Event & { currentTarget: HTMLInputElement }} */ event) {
		loop.to = Number(event.currentTarget.value);
		player.restartIfPlaying();
	}

	function loopEverything() {
		loop.loopEverything();
		player.restartIfPlaying();
	}
</script>

<div class="loopbar" class:partial={loop.isPartial}>
	<span class="font-semibold">Loop</span>

	<select
		bind:value={loop.section}
		onchange={chooseSection}
		disabled={arrangement.sections.length === 0}
		aria-label="Loop which part"
		use:tooltip={TIPS.player.loopSection}
		class="w-44 ui-field px-2 py-1"
	>
		<option value={WHOLE_ARRANGEMENT}>Whole arrangement</option>
		{#each arrangement.sections as section, index (index)}
			<option value={index}>{section.name}</option>
		{/each}
	</select>

	<label class="flex items-center gap-2">
		bars
		<input
			type="number"
			min="1"
			max={loop.barCount}
			bind:value={loop.from}
			onchange={() => player.restartIfPlaying()}
			aria-label="First bar"
			use:tooltip={TIPS.player.loopFrom}
			class="w-16 ui-field px-2 py-1"
		/>
	</label>
	<label class="flex items-center gap-2">
		to
		<input
			type="number"
			min="1"
			max={loop.barCount}
			value={Math.min(loop.to, loop.barCount)}
			onchange={chooseLastBar}
			aria-label="Last bar"
			use:tooltip={TIPS.player.loopTo}
			class="w-16 ui-field px-2 py-1"
		/>
	</label>
	<span class="text-sm text-ink-soft">of {loop.barCount}</span>

	{#if loop.isPartial}
		<button
			type="button"
			class="ui-button px-3 py-1 text-sm text-accent"
			onclick={loopEverything}
			use:tooltip={TIPS.player.loopEverything}
		>
			Loop everything
		</button>
	{/if}
</div>

<style>
	/* Same height whether or not part is chosen, so nothing below it moves */
	.loopbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		min-height: 2.75rem;
		margin-bottom: 0.75rem;
		border-radius: var(--corner-control);
		padding: 0.25rem 0.5rem;
	}

	.loopbar.partial {
		box-shadow: var(--shadow-inset-small);
		color: var(--color-accent);
	}
</style>
