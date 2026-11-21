<script>
	/**
	 * The Beats row under the ruler, like Logic's beat mapping: a dot on
	 * every beat the recording has (darker on each ONE). Only while fixing
	 * the beats (TranscriptionState.fixingBeats) can they be moved: when a beat's hit
	 * sits off its line in the recording lane, drag the dot onto the hit:
	 * letting go snaps it onto the strongest hit near there, and the
	 * recording is bent again so the hit sits on the line. Tap a dot for its
	 * menu (a bar starts here, add or remove a beat).
	 */
	import { secondsAt } from '../../transcription/tempoMap.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, scale } = $props();

	/** A press that moves less than this (px) is a tap. */
	const DRAG_THRESHOLD = 4;

	/** @type {{ index: number, startX: number, offset: number, moved: boolean } | null} */
	let drag = $state(null);

	/** Bar 1's beat as shown: the beats slide with the recording. */
	const firstBeat = $derived(
		(transcription.grid?.bars.firstBeat ?? 0) - transcription.slidePreview
	);
	const beats = $derived(transcription.grid?.beats ?? []);
	const trim = $derived(transcription.grid?.trim ?? { from: 0, to: 0 });
	/** The ONEs, once the time lays the bars out. */
	const ones = $derived(
		new Set(
			transcription.timeChosen
				? transcription.bars.map((bar) => bar.firstBeat - transcription.slidePreview)
				: []
		)
	);
	/** Only the beats of the trimmed recording are shown. */
	const kept = $derived(
		beats.flatMap((time, index) => (time >= trim.from && time <= trim.to ? [index] : []))
	);
	const quarterWidth = $derived(scale.toX(1) - scale.toX(0));

	/** @param {number} index */
	function xOf(index) {
		return scale.toX(index - firstBeat);
	}

	/**
	 * @param {PointerEvent & { currentTarget: HTMLElement }} event
	 * @param {number} index
	 */
	function press(event, index) {
		event.currentTarget.setPointerCapture(event.pointerId);
		drag = { index, startX: event.clientX, offset: 0, moved: false };
	}

	/** @param {PointerEvent} event */
	function move(event) {
		if (!drag) return;
		const offset = event.clientX - drag.startX;
		drag = { ...drag, offset, moved: drag.moved || Math.abs(offset) > DRAG_THRESHOLD };
	}

	function release() {
		const done = drag;
		drag = null;
		const grid = transcription.grid;
		if (!done || !grid) return;
		if (!done.moved) {
			transcription.openBeatMenu(done.index);
			return;
		}
		const quarters = done.index - firstBeat + done.offset / quarterWidth;
		transcription.moveBeatTo(done.index, secondsAt(grid, quarters));
	}
</script>

<div class="row">
	{#if !transcription.fixingBeats}
		{#each kept as index (index)}
			<span class="dot still" class:one={ones.has(index)} style:left="{xOf(index)}px"></span>
		{/each}
	{:else}
		{#each kept as index (index)}
			{@const dragging = drag?.index === index && drag.moved}
			<button
				type="button"
				class="dot"
				class:one={ones.has(index)}
				class:picked={transcription.selectedBeat === index}
				class:dragging
				style:left="{xOf(index) + (dragging && drag ? drag.offset : 0)}px"
				onpointerdown={(event) => press(event, index)}
				onpointermove={move}
				onpointerup={release}
				onpointercancel={() => (drag = null)}
				aria-label="Beat {index - firstBeat + 1}"
				use:tooltip={TIPS.transcription.beatDot}
			></button>
			{#if dragging && drag}
				<div class="guide" style:left="{xOf(index) + drag.offset}px"></div>
			{/if}
		{/each}
	{/if}
</div>

<style>
	.row {
		position: relative;
		height: var(--beats-row-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
		background: var(--color-surface);
	}

	.dot {
		position: absolute;
		top: 50%;
		width: 0.7rem;
		height: 0.7rem;
		margin: -0.35rem 0 0 -0.35rem;
		padding: 0;
		border: 1px solid var(--color-ink-soft);
		border-radius: 9999px;
		background: var(--color-raised);
		cursor: ew-resize;
		touch-action: none;
	}

	.dot.still {
		cursor: default;
		pointer-events: none;
	}

	.dot.one {
		background: var(--color-ink);
		border-color: var(--color-ink);
	}

	.dot.picked,
	.dot.dragging {
		background: var(--color-accent);
		border-color: var(--color-accent);
		z-index: 4;
	}

	/* while dragging, a line down through the lanes to put on the hit */
	.guide {
		position: absolute;
		top: 0;
		z-index: 3;
		width: 2px;
		height: var(--lanes-height);
		margin-left: -1px;
		background: var(--color-accent);
		pointer-events: none;
	}
</style>
