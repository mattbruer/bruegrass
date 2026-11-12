<script>
	/**
	 * The chords, by beat. Each bar shows its chords as chips, each as wide
	 * as it lasts (G for two beats, then C). Tap a bar and it opens into a
	 * box on each beat: type the chord on the beat where it changes and leave
	 * the rest empty (the chord before carries on). Tab moves along the
	 * beats, Enter keeps them, Escape leaves the bar as it was. Typing "G C"
	 * in the first box alone splits the bar evenly, as a chart does.
	 */
	import { tick } from 'svelte';
	import { changesIn } from '../../transcription/barChords.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, scale } = $props();

	/** @type {number | null} the bar open for typing */
	let editing = $state(null);
	/** @type {string[]} what's in each beat's box */
	let boxes = $state([]);
	/** @type {HTMLElement | undefined} */
	let openBar = $state();

	const first = $derived(transcription.bars[0]?.firstBeat ?? 0);
	const quarter = $derived(scale.toX(1) - scale.toX(0));

	/** @param {import('../../transcription/barPlan.js').Bar} bar */
	async function open(bar) {
		editing = bar.number;
		boxes = transcription.slotsOf(bar).map((slot) => slot ?? '');
		await tick();
		openBar?.querySelector('input')?.focus();
	}

	function keep() {
		if (editing === null) return;
		const number = editing;
		editing = null;
		transcription.setBarChords(number, boxes);
	}

	/** @param {KeyboardEvent} event */
	function onKey(event) {
		if (event.key === 'Enter') keep();
		else if (event.key === 'Escape') editing = null;
	}

	/** @param {FocusEvent & { currentTarget: HTMLElement }} event keep when focus leaves the bar's boxes */
	function onFocusOut(event) {
		const next = /** @type {Node | null} */ (event.relatedTarget);
		if (!next || !event.currentTarget.contains(next)) keep();
	}
</script>

<div class="lane">
	{#each transcription.bars as bar (bar.number)}
		{@const left = scale.toX(bar.firstBeat - first)}
		{#if editing === bar.number}
			<div
				bind:this={openBar}
				class="open"
				style:left="{left}px"
				role="group"
				aria-label="Chords in bar {bar.number}, a box for each beat"
				onfocusout={onFocusOut}
			>
				{#each boxes, beat (beat)}
					<input
						bind:value={boxes[beat]}
						class="box ui-field"
						style:width="{quarter - 2}px"
						placeholder={String(beat + 1)}
						onkeydown={onKey}
						aria-label="Beat {beat + 1}"
						autocapitalize="characters"
						autocomplete="off"
						spellcheck="false"
					/>
				{/each}
			</div>
		{:else}
			{@const changes = changesIn(transcription.slotsOf(bar))}
			<button
				type="button"
				class="bar"
				style:left="{left}px"
				style:width="{bar.beats * quarter}px"
				onclick={() => open(bar)}
				aria-label="Bar {bar.number} chords: {changes.map((change) => change.name).join(', ') ||
					'none yet'}"
				use:tooltip={TIPS.transcription.chordBar}
			>
				{#if changes.length === 0}
					<span class="empty">·</span>
				{/if}
				{#each changes as change (change.beat)}
					<span
						class="chip"
						style:left="{change.beat * quarter + 2}px"
						style:width="{change.beats * quarter - 4}px">{change.name}</span
					>
				{/each}
			</button>
		{/if}
	{/each}
</div>

<style>
	.lane {
		position: relative;
		height: var(--lane-height);
		border-bottom: 1px solid var(--color-line);
	}

	.bar {
		position: absolute;
		top: 0;
		bottom: 0;
		padding: 0;
		border-left: 1px solid var(--color-line);
		background: transparent;
		cursor: text;
	}

	.chip {
		position: absolute;
		top: 0.35rem;
		bottom: 0.35rem;
		display: flex;
		align-items: center;
		padding: 0 0.35rem;
		overflow: hidden;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 700;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-small);
		background: var(--color-raised);
	}

	.empty {
		padding-left: 0.4rem;
		color: var(--color-ink-faint);
	}

	.open {
		position: absolute;
		top: 0.2rem;
		bottom: 0.2rem;
		z-index: 3;
		display: flex;
		gap: 2px;
	}

	.box {
		padding: 0 0.2rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-align: center;
	}
</style>
