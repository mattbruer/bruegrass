<script>
	/**
	 * A mixer control you move by grabbing its cap, like a real fader.
	 *
	 * - Only the cap can be dragged, and it moves from where it is: touching
	 *   the track never makes it jump. A swipe that starts anywhere else is
	 *   left to the page (scrolling the mixer sideways).
	 * - Dragging is relative, so the cap stays under your finger.
	 * - Tapping the readout (or double-clicking the cap) resets it.
	 * - Keyboard: arrows nudge, Page Up/Down move further, Home/End go to the ends.
	 *
	 * The value can be on any scale: `toPosition`/`fromPosition` map it to
	 * the cap's travel, 0 (bottom/left) to 1 (top/right).
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/**
	 * @type {{
	 *   value: number,
	 *   toPosition: (value: number) => number,
	 *   fromPosition: (position: number) => number,
	 *   format: (value: number) => string,
	 *   reset: number,
	 *   label: string,
	 *   orientation?: 'vertical' | 'horizontal',
	 *   max?: number,
	 *   variant?: string,
	 *   name?: string,
	 *   showValue?: boolean,
	 *   tip?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 *   max: highest position the cap may reach (e.g. a send that stops at unity)
	 *   variant: extra class on the root for a different cap (e.g. 'master')
	 *   name: a small caption, beside the readout above a horizontal slider
	 *   showValue: false hides the readout, for controls where the position
	 *     says it all (a send: none at one end, the most at the other).
	 *     `format` is still what screen readers hear; double-click resets.
	 *   tip: a tooltip saying what the control does (see $lib/tooltips)
	 *   children: drawn beside the track, the same length as it (a fader's scale)
	 */
	let {
		value = $bindable(),
		toPosition,
		fromPosition,
		format,
		reset,
		label,
		orientation = 'horizontal',
		max = 1,
		variant = '',
		name = '',
		showValue = true,
		tip,
		children
	} = $props();

	/* Keyboard steps, as fractions of the travel */
	const NUDGE = 0.01;
	const BIG_STEP = 0.1;
	/** Most steps a key press takes to get out of a detent. */
	const MAX_DETENT_STEPS = 10;

	let vertical = $derived(orientation === 'vertical');
	let position = $derived(Math.min(max, Math.max(0, toPosition(value))));
	let dragging = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let track = $state();
	/** @type {HTMLDivElement | undefined} */
	let cap = $state();
	/** Where the drag started: pointer coordinate and cap position. */
	let start = { pointer: 0, position: 0 };

	/** @param {number} next 0–1 */
	function moveTo(next) {
		value = fromPosition(Math.min(max, Math.max(0, next)));
	}

	/** @param {PointerEvent} event */
	function grab(event) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		event.preventDefault(); // no text selection or scrolling while dragging
		cap?.setPointerCapture(event.pointerId);
		track?.focus({ preventScroll: true });
		dragging = true;
		start = { pointer: vertical ? event.clientY : event.clientX, position };
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (!dragging || !track || !cap) return;
		const box = track.getBoundingClientRect();
		const travel = vertical ? box.height - cap.offsetHeight : box.width - cap.offsetWidth;
		if (travel <= 0) return;
		const moved = vertical ? start.pointer - event.clientY : event.clientX - start.pointer;
		moveTo(start.position + moved / travel);
	}

	function release() {
		dragging = false;
	}

	/** @param {KeyboardEvent} event */
	function key(event) {
		const steps = {
			ArrowUp: NUDGE,
			ArrowRight: NUDGE,
			ArrowDown: -NUDGE,
			ArrowLeft: -NUDGE,
			PageUp: BIG_STEP,
			PageDown: -BIG_STEP
		};
		if (event.key in steps) {
			// Step past a detent (centre pan, unity gain) that would otherwise snap straight back
			const step = steps[/** @type {keyof typeof steps} */ (event.key)];
			const before = value;
			for (let n = 1; n <= MAX_DETENT_STEPS && value === before; n++) moveTo(position + n * step);
		} else if (event.key === 'Home') moveTo(0);
		else if (event.key === 'End') moveTo(max);
		else return;
		event.preventDefault();
	}
</script>

{#snippet readout()}
	<button type="button" class="readout" tabindex="-1" onclick={() => (value = reset)}>
		{format(value)}
	</button>
{/snippet}

<div class="slider {orientation} {variant}" class:dragging use:tooltip={tip}>
	{#if !vertical}
		<div class="caption">
			<span class="name">{name}</span>
			{#if showValue}{@render readout()}{/if}
		</div>
	{/if}
	<div class="body">
		<div
			bind:this={track}
			class="track"
			role="slider"
			tabindex="0"
			aria-label={label}
			aria-orientation={orientation}
			aria-valuemin={0}
			aria-valuemax={Math.round(max * 100)}
			aria-valuenow={Math.round(position * 100)}
			aria-valuetext={format(value)}
			onkeydown={key}
		>
			<div class="groove" aria-hidden="true"></div>
			<div
				bind:this={cap}
				class="cap"
				style="--position: {position}"
				aria-hidden="true"
				onpointerdown={grab}
				onpointermove={drag}
				onpointerup={release}
				onpointercancel={release}
				onlostpointercapture={release}
				ondblclick={() => (value = reset)}
			></div>
		</div>
		{@render children?.()}
	</div>
	{#if vertical}
		{#if showValue}{@render readout()}{/if}
	{/if}
</div>

<style>
	.slider {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.slider.vertical {
		flex-direction: column;
	}

	.body {
		display: flex;
		gap: 0.15rem;
	}

	.vertical .body {
		height: var(--fader-length, 11rem);
	}

	.track {
		position: relative;
		flex-shrink: 0;
		/* Off the cap, a touch is left to the page: sideways swipes scroll the mixer */
		touch-action: pan-x;
		outline: none;
	}

	.track:focus-visible {
		border-radius: var(--corner-small);
		box-shadow: 0 0 0 2px var(--color-accent);
	}

	/* Grooves are pressed into the surface; caps are raised out of it */
	.groove {
		position: absolute;
		border-radius: 9999px;
		background: var(--color-surface-deep);
		box-shadow: var(--shadow-inset-small);
	}

	.cap {
		position: absolute;
		background: var(--color-surface);
		box-shadow: var(--shadow-raised-small);
		cursor: grab;
		touch-action: none; /* the cap's drag is ours, never a scroll */
	}

	.dragging .cap {
		cursor: grabbing;
		box-shadow:
			var(--shadow-raised-small),
			0 0 0 2px var(--color-accent-soft);
	}

	/* Vertical: the channel fader */
	.vertical .track {
		--cap: 1.1rem;
		flex: 1;
		width: 2.25rem;
	}

	.vertical .groove {
		top: calc(var(--cap) / 2);
		bottom: calc(var(--cap) / 2);
		left: calc(50% - 0.2rem);
		width: 0.4rem;
	}

	.vertical .cap {
		left: 0;
		top: calc((1 - var(--position)) * (100% - var(--cap)));
		width: 100%;
		height: var(--cap);
		border-radius: var(--corner-small);
		/* A line across the middle marks the level, like a fader cap's */
		background:
			linear-gradient(var(--color-ink-faint), var(--color-ink-faint)) center / 70% 2px no-repeat,
			var(--color-surface);
	}

	.master .cap {
		background:
			linear-gradient(var(--color-accent), var(--color-accent)) center / 70% 2px no-repeat,
			var(--color-surface);
	}

	/* A bigger invisible grab area, so the cap is easy to catch with a finger */
	.vertical .cap::before {
		content: '';
		position: absolute;
		inset: -0.6rem -0.4rem;
	}

	/* Horizontal: the small knobs */
	.horizontal {
		flex-direction: column;
		gap: 0.25rem;
	}

	/* Name and value on one line above a small slider, to keep strips short */
	.caption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
		width: 100%;
	}

	.name {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}

	.horizontal .track {
		--cap: 1rem;
		width: var(--slider-length, 5rem);
		height: var(--cap);
	}

	.horizontal .groove {
		top: calc(50% - 0.15rem);
		left: calc(var(--cap) / 2);
		right: calc(var(--cap) / 2);
		height: 0.3rem;
	}

	.horizontal .cap {
		top: 0;
		left: calc(var(--position) * (100% - var(--cap)));
		width: var(--cap);
		height: var(--cap);
		border-radius: 9999px;
	}

	.horizontal .cap::before {
		content: '';
		position: absolute;
		inset: -0.5rem;
	}

	/* The value, in a small sunk window; tap it to reset */
	.readout {
		min-width: 2.5rem;
		border-radius: var(--corner-small);
		background: var(--color-surface);
		padding: 0.05rem 0.3rem;
		text-align: center;
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
		color: var(--color-ink);
		box-shadow: var(--shadow-inset-small);
	}

	.dragging .readout {
		color: var(--color-accent);
	}
</style>
