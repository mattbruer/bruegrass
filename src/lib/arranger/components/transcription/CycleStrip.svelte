<script>
	/**
	 * The cycle strip above the ruler, Logic's way: drag across it to make a
	 * cycle (its ends snap to bar lines) and it turns on; click it to turn
	 * the cycle on or off (with no cycle yet, a click cycles that bar).
	 */
	import { barAround, barLines, cycleBetween } from '../../transcription/cycle.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   ruler: import('../../tracks/ruler.js').RulerBar[],
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, ruler, scale } = $props();

	/** px before a press counts as a drag */
	const DRAG_THRESHOLD = 4;

	const lines = $derived(barLines(ruler));
	/** @type {{ x: number, quarters: number } | null} */
	let press = null;
	/** The cycle being dragged out (null when not dragging). */
	let dragged = $state.raw(
		/** @type {import('../../transcription/cycle.js').Cycle | null} */ (null)
	);
	const shown = $derived(dragged ?? transcription.cycle);

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function quartersAt(event) {
		const box = event.currentTarget.getBoundingClientRect();
		return scale.toQuarters(event.clientX - box.left) + scale.start;
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function down(event) {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		press = { x: event.clientX, quarters: quartersAt(event) };
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function move(event) {
		if (!press || (!dragged && Math.abs(event.clientX - press.x) < DRAG_THRESHOLD)) return;
		dragged = cycleBetween(press.quarters, quartersAt(event), lines);
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function up(event) {
		if (!press) return;
		const made = dragged;
		const clickedAt = press.quarters;
		press = null;
		dragged = null;
		if (made) return transcription.setCycle(made);
		if (transcription.cycle) return transcription.setCycling(!transcription.cycling);
		const bar = barAround(clickedAt, lines);
		if (bar) transcription.setCycle(bar);
		event.preventDefault();
	}

	function cancel() {
		press = null;
		dragged = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (C and the Cycle button work from the keyboard) -->
<div
	class="strip"
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={cancel}
	use:tooltip={TIPS.transcription.cycleStrip}
>
	{#if shown}
		<div
			class="region"
			class:on={transcription.cycling || dragged}
			style:left="{scale.toX(shown.from)}px"
			style:width="{scale.toX(shown.to) - scale.toX(shown.from)}px"
		></div>
	{/if}
</div>

<style>
	.strip {
		position: relative;
		height: var(--cycle-row-height);
		border-bottom: 1px solid var(--color-line);
		background: var(--color-surface);
		cursor: pointer;
		touch-action: none;
	}

	.region {
		position: absolute;
		top: 3px;
		bottom: 3px;
		border-radius: 3px;
		border: 1px solid var(--color-ink-faint);
		background: color-mix(in oklch, var(--color-ink-faint) 25%, transparent);
	}

	.region.on {
		border-color: var(--color-accent);
		background: var(--color-accent);
	}
</style>
