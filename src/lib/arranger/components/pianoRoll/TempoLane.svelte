<script>
	/**
	 * The tempo lane above the piano roll, like Logic's automation: the
	 * song's tempo as a line, bent by points (a ritard at the end, say).
	 *
	 * Bar 1 is always at the song's tempo. A new point is put on the line
	 * where you click, so it changes nothing until it's dragged.
	 *
	 * Mouse: click to add a point (keep the button down to drag it), drag a
	 * point to move it, double-click it to delete. Touch: tap to add, drag
	 * a point, double-tap to delete; a swipe scrolls. Keys, once a point is
	 * picked: ↑ ↓ a BPM, Delete removes it.
	 *
	 * There's no limit: the lane's span widens to take in every point, and
	 * a point dragged past the lane's edge keeps going.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { snapDown, TICKS_PER_QUARTER } from '../../melody/roll/ticks.js';
	import { shareAt } from '../../chart/tempoCurve.js';
	import {
		laneRange,
		movedPoint,
		wholeBpmShare,
		withoutPoint,
		withPoint
	} from '../../chart/editTempoCurve.js';

	const MOVE_THRESHOLD = 6; // px before a press counts as a drag
	const DOUBLE_TAP_MS = 350;
	const PAD = 6; // px kept clear above and below the line's range
	const STEADY_PULL = 0.03; // a point this close to the song's tempo lands on it

	/**
	 * @type {{
	 *   points: import('../../chart/tempoCurve.js').TempoPoint[],
	 *   bpm: number,
	 *   width: number,
	 *   height: number,
	 *   tickWidth: number,
	 *   gridStep: number,
	 *   tickAt: (quarters: number) => number | null,
	 *   timeAt: (ticks: number) => number | null,
	 *   onChange: (points: import('../../chart/tempoCurve.js').TempoPoint[]) => void
	 * }}
	 */
	let { points, bpm, width, height, tickWidth, gridStep, tickAt, timeAt, onChange } = $props();

	/** The points while a drag is under way. */
	let preview = $state.raw(/** @type {typeof points | null} */ (null));
	let selected = $state(-1);
	let shown = $derived(preview ?? points);
	/** Held still while dragging, so the point stays under the pointer. */
	let heldRange = $state.raw(/** @type {ReturnType<typeof laneRange> | null} */ (null));
	let range = $derived(heldRange ?? laneRange(points));

	/** @param {number} share */
	const yOf = (share) =>
		PAD + ((range.high - share) / (range.high - range.low)) * (height - 2 * PAD);
	/** @param {number} y */
	const shareOf = (y) => range.high - ((y - PAD) / (height - 2 * PAD)) * (range.high - range.low);
	/** @param {number} quarters */
	const xOf = (quarters) => {
		const ticks = tickAt(quarters);
		return ticks === null ? null : ticks * tickWidth;
	};

	let placed = $derived(
		shown.flatMap((point, index) => {
			const x = xOf(point.at);
			return x === null
				? []
				: [{ index, x, y: yOf(point.share), bpm: Math.round(point.share * bpm) }];
		})
	);
	let line = $derived.by(() => {
		// Flat at the song's tempo through any pickup, up to bar 1
		const barOne = { x: xOf(0) ?? 0, y: yOf(1) };
		const ends = [
			{ x: 0, y: yOf(1) },
			barOne,
			...placed,
			{ x: width, y: placed.at(-1)?.y ?? yOf(1) }
		];
		return ends.map(({ x, y }) => `${x},${y}`).join(' ');
	});

	/** @type {SVGSVGElement | undefined} */
	let lane = $state();

	/** @param {PointerEvent} event */
	function locate(event) {
		const box = /** @type {SVGSVGElement} */ (lane).getBoundingClientRect();
		const x = event.clientX - box.left;
		const y = event.clientY - box.top;
		const at = timeAt(snapDown(x / tickWidth, gridStep));
		const share = Math.abs(shareOf(y) - 1) < STEADY_PULL ? 1 : wholeBpmShare(shareOf(y), bpm);
		return { x, y, point: at === null ? null : { at, share } };
	}

	/**
	 * @typedef {{ kind: 'add' | 'move', index: number, x: number, y: number, moved: boolean, start: typeof points }} Gesture
	 */
	/** @type {Gesture | null} */
	let gesture = null;
	let lastTap = { index: -1, time: 0 };

	/** @param {PointerEvent} event */
	function press(event) {
		if (event.button !== 0) return;
		heldRange = range;
		const at = locate(event);
		lane?.focus({ preventScroll: true });
		const grabbed = /** @type {Element} */ (event.target).closest('[data-index]');
		if (grabbed) {
			const index = Number(/** @type {HTMLElement} */ (grabbed).dataset.index);
			const now = performance.now();
			if (lastTap.index === index && now - lastTap.time < DOUBLE_TAP_MS) {
				lastTap = { index: -1, time: 0 };
				remove(index);
				return;
			}
			lastTap = { index, time: now };
			selected = index;
			gesture = { kind: 'move', index, x: at.x, y: at.y, moved: false, start: points };
			lane?.setPointerCapture(event.pointerId);
			event.preventDefault();
			return;
		}
		if (!at.point) return;
		gesture = { kind: 'add', index: -1, x: at.x, y: at.y, moved: false, start: points };
		if (event.pointerType === 'touch') return; // a swipe scrolls; a tap adds on release
		const added = withPoint(points, onTheLine(at.point));
		preview = added.points;
		selected = added.index;
		gesture = { ...gesture, kind: 'move', index: added.index, start: added.points };
		lane?.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (!gesture) return;
		const at = locate(event);
		if (Math.hypot(at.x - gesture.x, at.y - gesture.y) > MOVE_THRESHOLD) gesture.moved = true;
		if (gesture.kind !== 'move' || !at.point) return;
		const step = gridStep / TICKS_PER_QUARTER;
		preview = movedPoint(gesture.start, gesture.index, at.point, step);
	}

	/** @param {PointerEvent} event */
	function release(event) {
		const done = gesture;
		gesture = null;
		heldRange = null;
		const edited = preview;
		preview = null;
		if (!done) return;
		if (done.kind === 'add') {
			const at = locate(event);
			if (done.moved || !at.point) return;
			const added = withPoint(points, onTheLine(at.point));
			selected = added.index;
			onChange(added.points);
			return;
		}
		if (edited) onChange(edited);
	}

	/** @param {import('../../chart/tempoCurve.js').TempoPoint} point */
	function onTheLine({ at }) {
		return { at, share: shareAt(points, at) };
	}

	function cancel() {
		gesture = null;
		heldRange = null;
		preview = null;
	}

	/** @param {number} index */
	function remove(index) {
		selected = -1;
		onChange(withoutPoint(points, index));
	}

	/** @param {KeyboardEvent} event */
	function keys(event) {
		const point = points[selected];
		if (!point) return;
		event.stopPropagation(); // the roll's own keys are for its notes
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			remove(selected);
			return;
		}
		const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
		if (!steps) return;
		event.preventDefault();
		const share = wholeBpmShare(point.share + steps / bpm, bpm);
		onChange(points.map((each, i) => (i === selected ? { ...each, share } : each)));
	}
</script>

<svg
	bind:this={lane}
	class="lane"
	{width}
	{height}
	role="application"
	aria-label="Tempo lane: click to add a tempo point, drag it to change the tempo there"
	tabindex="-1"
	onpointerdown={press}
	onpointermove={drag}
	onpointerup={release}
	onpointercancel={cancel}
	onkeydown={keys}
	use:tooltip={TIPS.melody.roll.tempoLane}
>
	<line class="steady" x1="0" x2={width} y1={yOf(1)} y2={yOf(1)} />
	<polyline class="curve" points={line} />
	{#if placed.length === 0}
		<text class="hint" x="6" y={yOf(1) - 5}>♩ = {Math.round(bpm)}</text>
	{/if}
	{#each placed as point (point.index)}
		<g class="point" class:selected={point.index === selected} data-index={point.index}>
			<circle class="target" cx={point.x} cy={point.y} r="12" />
			<circle class="dot" cx={point.x} cy={point.y} r="4.5" />
			<text class="bpm" x={point.x + 7} y={point.y < height / 2 ? point.y + 13 : point.y - 6}
				>{point.bpm}</text
			>
		</g>
	{/each}
</svg>

<style>
	.lane {
		display: block;
		background: var(--color-surface-deep);
		cursor: crosshair;
		touch-action: pan-x;
		outline: none;
	}
	.steady {
		stroke: var(--color-line);
		stroke-dasharray: 3 3;
	}
	.curve {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2;
	}
	.hint,
	.bpm {
		font-size: 0.7rem;
		fill: var(--color-ink-soft);
		pointer-events: none;
		user-select: none;
	}
	.point {
		cursor: grab;
		touch-action: none;
	}
	.target {
		fill: transparent;
	}
	.dot {
		fill: var(--color-raised);
		stroke: var(--color-accent);
		stroke-width: 2;
	}
	.point.selected .dot {
		fill: var(--color-accent);
		stroke: var(--color-ink);
	}
	.point.selected .bpm {
		fill: var(--color-ink);
		font-weight: 600;
	}
</style>
