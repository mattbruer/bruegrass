<script>
	/**
	 * The chords, by beat, on Transcribe's grid and the Tracks page. Each bar
	 * shows its chords as chips, each as wide as it lasts (G for two beats,
	 * then C). Tap a bar and it opens into a box on each beat a chord may
	 * change on (`chordPlaces`: beats 1 and 3 in 4/4): type the chord where
	 * it changes and leave the rest empty (the chord before carries on). One
	 * chord to a box: a space or comma is taken out as it's typed. Tab moves
	 * along the boxes, Enter keeps them, Escape leaves the bar as it was. A
	 * box is checked as you leave it, and a chord the band can't play isn't
	 * kept: the bar stays open and says why. The host says what the bars
	 * hold and writes what's kept.
	 */
	import { tick } from 'svelte';
	import { changesIn, placesFor, slotsFromPlaces } from '../../transcription/barChords.js';
	import { chordBoxProblem, isKnownChord } from '../../chart/knownChords.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @typedef {{ number: number, start: number, beats: number }} LaneBar
	 *   start: where it starts, as the scale counts (scale.toX(start))
	 * @typedef {import('../../transcription/barChords.js').Slots} Slots
	 */

	/**
	 * @type {{
	 *   bars: LaneBar[],
	 *   slotsOf: (bar: LaneBar) => Slots,
	 *   isHeld: (bar: LaneBar) => boolean,
	 *   setChords: (bar: LaneBar, typed: (string | null)[]) => string,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   label?: (name: string) => string
	 * }}
	 *   label: how a chord is written on its chip (the Tracks page shows the key change; typing still takes the chart's own chords);
	 *   setChords: writes a bar's boxes, one slot per beat; returns why it couldn't ('' : kept)
	 */
	let { bars, slotsOf, isHeld, setChords, scale, label = (name) => name } = $props();

	/** @type {number | null} the bar open for typing */
	let editing = $state(null);
	/** @type {string[]} what's in each box */
	let boxes = $state([]);
	/** @type {number[]} the beat each box starts on */
	let places = $state([]);
	let beatsInBar = $state(0);
	/** @type {HTMLElement | undefined} */
	let openBar = $state();
	/** Why the open bar's chords weren't kept ('' : nothing wrong). */
	let problem = $state('');
	/** The open bar is on the right of the screen, so its message opens leftward. */
	let onTheRight = $state(false);

	const quarter = $derived(scale.toX(1) - scale.toX(0));

	/** @param {LaneBar} bar */
	async function open(bar) {
		editing = bar.number;
		problem = '';
		const slots = slotsOf(bar);
		places = placesFor(slots);
		beatsInBar = bar.beats;
		boxes = places.map((beat) => slots[beat] ?? '');
		await tick();
		openBar?.querySelector('input')?.focus();
	}

	function keep() {
		const bar = bars.find((each) => each.number === editing);
		if (!bar) return;
		const typed = slotsFromPlaces(boxes, places, beatsInBar);
		say(typed.map((text) => chordBoxProblem(text ?? '')).find(Boolean) || setChords(bar, typed));
		if (!problem) editing = null;
	}

	/** Check the boxes as one is left, so a wrong chord shows at once. */
	function check() {
		say(boxes.map(chordBoxProblem).find(Boolean) ?? '');
	}

	/** @param {string} message */
	function say(message) {
		problem = message;
		if (problem && openBar)
			onTheRight = openBar.getBoundingClientRect().left > window.innerWidth / 2;
	}

	/**
	 * Keep a box to one chord: whatever would start a second (a space,
	 * comma or bar) is taken out as it's typed or pasted.
	 * @param {number} i
	 */
	function oneChord(i) {
		boxes[i] = boxes[i].replace(/[\s,|]/g, '');
	}

	/** @param {KeyboardEvent} event */
	function onKey(event) {
		if (event.key === 'Enter') keep();
		else if (event.key === 'Escape') {
			editing = null;
			problem = '';
		}
	}

	/** @param {FocusEvent & { currentTarget: HTMLElement }} event keep when focus leaves the bar's boxes */
	function onFocusOut(event) {
		const next = /** @type {Node | null} */ (event.relatedTarget);
		if (!next || !event.currentTarget.contains(next)) keep();
	}
</script>

<div class="lane">
	{#each bars as bar (bar.number)}
		{@const left = scale.toX(bar.start)}
		{#if editing === bar.number}
			<div
				bind:this={openBar}
				class="open"
				style:left="{left}px"
				role="group"
				aria-label="Chords in bar {bar.number}, a box for each beat a chord can change on"
				onfocusout={onFocusOut}
			>
				{#each places as beat, i (beat)}
					<input
						bind:value={boxes[i]}
						class="box ui-field"
						style:width="{((places[i + 1] ?? bar.beats) - beat) * quarter - 2}px"
						placeholder={String(beat + 1)}
						onkeydown={onKey}
						oninput={() => oneChord(i)}
						onchange={check}
						aria-label="Beat {beat + 1}"
						aria-invalid={problem !== '' && chordBoxProblem(boxes[i]) !== ''}
						autocapitalize="characters"
						autocomplete="off"
						spellcheck="false"
					/>
				{/each}
				{#if problem}
					<p class="problem" class:leftward={onTheRight} role="alert">{problem}</p>
				{/if}
			</div>
		{:else}
			{@const changes = changesIn(slotsOf(bar))}
			<button
				type="button"
				class="bar"
				style:left="{left}px"
				style:width="{bar.beats * quarter}px"
				onclick={() => open(bar)}
				aria-label="Bar {bar.number} chords: {isHeld(bar)
					? 'the chord before carries on'
					: changes.map((change) => label(change.name)).join(', ') || 'none yet'}"
				use:tooltip={TIPS.chordLane.bar}
			>
				{#if isHeld(bar)}
					<span class="chip held" style:left="2px" style:width="{bar.beats * quarter - 4}px"></span>
				{:else if changes.length === 0}
					<span class="empty">·</span>
				{/if}
				{#each changes as change (change.beat)}
					<span
						class="chip"
						class:unknown={!isKnownChord(change.name)}
						style:left="{change.beat * quarter + 2}px"
						style:width="{change.beats * quarter - 4}px">{label(change.name)}</span
					>
				{/each}
			</button>
		{/if}
	{/each}
</div>

<style>
	.lane {
		position: relative;
		min-height: var(--lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
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

	.chip.unknown {
		color: var(--color-danger);
		border-color: var(--color-danger);
		text-decoration: wavy underline;
	}

	.box[aria-invalid='true'] {
		border: 2px solid var(--color-danger);
	}

	.problem {
		position: absolute;
		top: calc(100% + 0.3rem);
		left: 0;
		width: max-content;
		max-width: min(22rem, 80vw);
		padding: 0.4rem 0.6rem;
		font-size: 0.8rem;
		color: var(--color-ink);
		border: 1px solid var(--color-danger);
		border-left-width: 4px;
		border-radius: var(--corner-small);
		background: var(--color-raised);
		box-shadow:
			0 2px 8px var(--shadow-dark-edge),
			var(--shadow-drop);
	}

	.problem.leftward {
		left: auto;
		right: 0;
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
