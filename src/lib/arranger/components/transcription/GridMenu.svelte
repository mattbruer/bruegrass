<script>
	/**
	 * The small menu over the grid for what you tapped: a bar number (its
	 * beats − / +, Loop) or a beat's dot (a bar starts here, add a beat after,
	 * remove it). It sits by what it's about; Escape or ✕ closes it.
	 */
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, scale } = $props();

	const firstBeat = $derived(transcription.grid?.bars.firstBeat ?? 0);
	const beat = $derived(transcription.selectedBeat);
	const beatBar = $derived(
		beat === null
			? null
			: (transcription.bars.find(
					(bar) => beat >= bar.firstBeat && beat < bar.firstBeat + bar.beats
				) ?? null)
	);
	const isOne = $derived(transcription.bars.some((bar) => bar.firstBeat === beat));
	const anchor = $derived(
		transcription.bar ? transcription.bar.firstBeat : beat !== null ? beat : null
	);
</script>

{#if anchor !== null}
	<div
		class="menu ui-card"
		style:left="calc(var(--header-width) + {scale.toX(anchor - firstBeat)}px)"
	>
		{#if transcription.bar}
			{@const bar = transcription.bar}
			<div class="flex items-center gap-2">
				<strong>Bar {bar.number}</strong>
				<button
					type="button"
					class="ml-auto size-7 ui-button text-sm"
					onclick={() => transcription.closeMenus()}
					aria-label="Close"
					use:tooltip={TIPS.transcription.closeMenu}>✕</button
				>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="size-8 ui-button"
					disabled={bar.beats <= 1}
					onclick={() => transcription.changeBarLength(-1)}
					aria-label="One beat fewer"
					use:tooltip={TIPS.transcription.fewerBeats}>−</button
				>
				<span class="tabular-nums">{bar.beats} beats</span>
				<button
					type="button"
					class="size-8 ui-button"
					onclick={() => transcription.changeBarLength(1)}
					aria-label="One beat more"
					use:tooltip={TIPS.transcription.moreBeats}>+</button
				>
			</div>
			<div class="flex items-center gap-2">
				<ToggleSwitch
					bind:on={() => transcription.looping, (on) => transcription.setLooping(on)}
					labelledBy="bar-loop"
					tip={TIPS.transcription.loop}
				/>
				<span id="bar-loop">Loop this bar</span>
			</div>
		{:else if beat !== null && beatBar}
			<div class="flex items-center gap-2">
				<strong>Bar {beatBar.number}, beat {beat - beatBar.firstBeat + 1}</strong>
				<button
					type="button"
					class="ml-auto size-7 ui-button text-sm"
					onclick={() => transcription.closeMenus()}
					aria-label="Close"
					use:tooltip={TIPS.transcription.closeMenu}>✕</button
				>
			</div>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left"
				disabled={isOne}
				onclick={() => transcription.barStartsHere()}
				use:tooltip={TIPS.transcription.barStartsHere}>A bar starts here</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left"
				onclick={() => transcription.addBeat()}
				use:tooltip={TIPS.transcription.addBeat}>Add a beat after</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left"
				onclick={() => transcription.removeBeat()}
				use:tooltip={TIPS.transcription.removeBeat}>Remove this beat</button
			>
		{/if}
	</div>
{/if}

<style>
	.menu {
		position: absolute;
		top: calc(var(--ruler-height) + var(--beats-row-height) + 0.25rem);
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 13rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
	}
</style>
