<script>
	/**
	 * The small menu over the grid for what you tapped: a bar number (its
	 * marker, beats − / +, cycle it; the setup's views show only some) or a beat's dot (a bar starts here, add a beat after,
	 * remove it). It sits by what it's about; Escape or ✕ closes it.
	 */
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import { MARKER_NAMES } from '../../transcription/markerNames.js';
	import { SECTION_END } from '../../transcription/readChartOnBars.js';

	/** How many beats before its bar a section's tune can start. */
	const PICKUP_BEATS = [0, 1, 2, 3];
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   view?: import('../../transcription/gridViews.js').GridView
	 * }} view: what a bar's menu shows (gridViews.js)
	 */
	let { transcription, scale, view = 'full' } = $props();

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
	/**
	 * Focus the element when `on` (a marker to name).
	 * @param {HTMLElement} element
	 * @param {boolean} on
	 */
	function focusWhen(element, on) {
		if (on) element.focus();
		return { update: (/** @type {boolean} */ now) => now && element.focus() };
	}

	const anchor = $derived(
		transcription.bar ? transcription.bar.firstBeat : beat !== null ? beat : null
	);
</script>

{#if anchor !== null}
	<div
		class="menu ui-card"
		class:markers-view={view === 'markers'}
		class:bars-view={view === 'bars'}
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
			{#if view !== 'bars'}
				<label class="flex items-center gap-2">
					<span>Marker</span>
					<input
						type="text"
						class="min-w-0 flex-1 ui-field px-2 py-1"
						list="marker-names"
						placeholder="Verse, Banjo solo…"
						value={transcription.markers[bar.number] ?? ''}
						onchange={(event) => transcription.setMarker(bar.number, event.currentTarget.value)}
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.currentTarget.blur();
								transcription.finishMarker();
							}
							if (event.key === 'Escape') transcription.closeMenus();
						}}
						use:focusWhen={transcription.naming}
						use:tooltip={TIPS.transcription.marker}
					/>
					<datalist id="marker-names">
						{#each MARKER_NAMES as name (name)}
							<option value={name}></option>
						{/each}
					</datalist>
				</label>
			{/if}
			{#if view === 'full'}
				{#if transcription.markers[bar.number] && transcription.markers[bar.number] !== SECTION_END}
					<label class="flex items-center gap-2">
						<span>Tune starts</span>
						<select
							class="min-w-0 flex-1 ui-field px-2 py-1"
							value={transcription.sectionPickup(bar.number)}
							onchange={(event) =>
								transcription.setSectionPickup(bar.number, Number(event.currentTarget.value))}
							use:tooltip={TIPS.transcription.sectionPickup}
						>
							{#each PICKUP_BEATS as beats (beats)}
								<option value={beats}
									>{beats === 0
										? 'on the bar'
										: `${beats} beat${beats === 1 ? '' : 's'} before (pickup)`}</option
								>
							{/each}
						</select>
					</label>
				{/if}
				<button
					type="button"
					class="ui-button px-3 py-1.5 text-sm"
					class:ui-button-on={transcription.markers[bar.number] === SECTION_END}
					onclick={() => transcription.setMarker(bar.number, SECTION_END)}
					use:tooltip={TIPS.transcription.sectionEnd}>End of section</button
				>
			{/if}
			{#if view !== 'markers'}
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
				{#if view === 'bars'}
					<p class="text-xs text-ink-soft">The bars after it move along.</p>
				{/if}
			{/if}
			{#if view === 'full'}
				<div class="flex items-center gap-2">
					<ToggleSwitch
						bind:on={
							() => transcription.cycle.isJustBar(bar.number),
							() => transcription.cycle.toggleBar(bar.number)
						}
						labelledBy="bar-loop"
						tip={TIPS.transcription.loop}
					/>
					<span id="bar-loop">Cycle this bar</span>
				</div>
			{/if}
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
		top: calc(var(--cycle-row-height) + var(--ruler-height) + var(--beats-row-height) + 0.25rem);
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 13rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
	}

	/* The setup's views have no cycle strip above the ruler (and naming, no beats row) */
	.menu.bars-view {
		top: calc(var(--ruler-height) + var(--beats-row-height) + 0.25rem);
	}

	.menu.markers-view {
		top: calc(var(--ruler-height) + 0.25rem);
	}
</style>
