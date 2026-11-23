<script>
	/**
	 * The cycle strip above the ruler, Logic's way: drag across it to make a
	 * cycle and it turns on (its ends snap to sixteenth notes, or go anywhere
	 * with Snap off); drag either end of the cycle to lengthen or shorten it,
	 * or its middle to slide it; click it to turn the cycle on or off (with no
	 * cycle yet, a click cycles that bar). `fit` given, every cycle made is
	 * fitted by it (Tracks: onto bar lines, as the band loops whole bars).
	 */
	import {
		barAround,
		barLines,
		cycleFromTo,
		grabbedPart,
		movedCycle
	} from '../../transcription/cycle.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @typedef {import('../../transcription/cycle.js').Cycle} Cycle */

	/**
	 * @type {{
	 *   cycle: { region: Cycle | null, on: boolean, set: (region: Cycle) => void, turn: (on: boolean) => void },
	 *   ruler: import('../../tracks/ruler.js').RulerBar[],
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   snap?: boolean,
	 *   fit?: (cycle: Cycle | null, lines: number[]) => Cycle | null
	 * }}
	 *   snap: ends on sixteenth notes (else anywhere, before `fit`)
	 */
	let { cycle, ruler, scale, snap = false, fit = (made) => made } = $props();

	/** px before a press counts as a drag */
	const DRAG_THRESHOLD = 4;
	/** px either side of the cycle's end that still grab it */
	const END_GRIP = 7;

	const lines = $derived(barLines(ruler));
	/** @type {{ x: number, quarters: number, part: 'from' | 'to' | 'body' | null, cycle: import('../../transcription/cycle.js').Cycle | null } | null} */
	let press = null;
	let hovering = $state(/** @type {'from' | 'to' | 'body' | null} */ (null));
	/** The cycle being dragged out (null when not dragging). */
	let dragged = $state.raw(
		/** @type {import('../../transcription/cycle.js').Cycle | null} */ (null)
	);
	const shown = $derived(dragged ?? cycle.region);

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function quartersAt(event) {
		const box = event.currentTarget.getBoundingClientRect();
		return scale.toQuarters(event.clientX - box.left) + scale.start;
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function partAt(event) {
		const region = cycle.region;
		const box = event.currentTarget.getBoundingClientRect();
		const edges = region ? { left: scale.toX(region.from), right: scale.toX(region.to) } : null;
		return grabbedPart(event.clientX - box.left, edges, END_GRIP);
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function down(event) {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		press = {
			x: event.clientX,
			quarters: quartersAt(event),
			part: partAt(event),
			cycle: cycle.region
		};
	}

	/** The cycle as the drag so far makes it. */
	function draggedCycle(/** @type {number} */ quarters) {
		const {
			part,
			cycle: before,
			quarters: pressedAt
		} = /** @type {NonNullable<typeof press>} */ (press);
		if (before && part === 'from') return fit(cycleFromTo(before.to, quarters, lines, snap), lines);
		if (before && part === 'to') return fit(cycleFromTo(before.from, quarters, lines, snap), lines);
		if (before && part === 'body')
			return fit(movedCycle(before, quarters - pressedAt, lines, snap), lines);
		return fit(cycleFromTo(pressedAt, quarters, lines, snap), lines);
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function move(event) {
		if (!press) {
			hovering = partAt(event);
			return;
		}
		if (!dragged && Math.abs(event.clientX - press.x) < DRAG_THRESHOLD) return;
		dragged = draggedCycle(quartersAt(event));
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function up(event) {
		if (!press) return;
		const made = dragged;
		const clickedAt = press.quarters;
		press = null;
		dragged = null;
		if (made) return cycle.set(made);
		if (cycle.region) return cycle.turn(!cycle.on);
		const bar = barAround(clickedAt, lines);
		if (bar) cycle.set(bar);
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
	class:resize={hovering === 'from' ||
		hovering === 'to' ||
		press?.part === 'from' ||
		press?.part === 'to'}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={cancel}
	use:tooltip={TIPS.cycle.strip}
>
	{#if shown}
		<div
			class="region"
			class:on={cycle.on || dragged}
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

	.strip.resize {
		cursor: ew-resize;
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
