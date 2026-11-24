<script>
	/**
	 * The tuner as a glowing trace: the note big at the top with Hz and
	 * cents beside it, and the last few seconds of pitch flowing down under
	 * it (drawTrace.js). Green is in tune, amber close, red far.
	 */
	import { onEveryFrame } from '$lib/audio/analysis/frameLoop.js';
	import { createNeedleFilter } from './needleFilter.js';
	import { createTraceHistory } from './traceHistory.js';
	import { drawTrace, colourFor, SECONDS_SHOWN, IN_TUNE } from './drawTrace.js';
	import { resolveColour } from './themeColour.js';
	import { noteName } from './noteNames.js';

	/** Where the newest point sits, from the top of the canvas (px). */
	const HEAD_TOP = 18;

	/** @type {{ tuner: import('./TunerState.svelte.js').TunerState }} */
	let { tuner } = $props();

	/** @type {HTMLElement | undefined} */
	let screen = $state();
	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	/** The readouts, written each frame. @type {Record<'cents' | 'hz', HTMLElement | undefined>} */
	const readouts = $state({ cents: undefined, hz: undefined });

	const shown = $derived(tuner.note === null ? null : noteName(tuner.note));

	/** @param {number} cents */
	const signed = (cents) =>
		`${cents > 0.05 ? '+' : cents < -0.05 ? '−' : ''}${Math.abs(cents).toFixed(1)}`;

	/** @param {Element} element */
	function themeColours(element) {
		return {
			screen: resolveColour(element, 'var(--tuner-screen)'),
			grid: resolveColour(element, 'var(--color-ink-soft)'),
			inTune: resolveColour(element, 'var(--meter-safe)'),
			close: resolveColour(element, 'var(--meter-hot)'),
			far: resolveColour(element, 'var(--meter-clip)')
		};
	}

	/** Keep the canvas's pixels matching its size on screen. @param {HTMLCanvasElement} target */
	function fitCanvas(target) {
		const scale = devicePixelRatio || 1;
		target.width = Math.round(target.clientWidth * scale);
		target.height = Math.round(target.clientHeight * scale);
	}

	$effect(() => {
		const root = screen;
		const target = canvas;
		const g = target?.getContext('2d');
		if (!root || !target || !g) return;

		const colours = themeColours(root);
		const sway = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		const history = createTraceHistory(SECONDS_SHOWN);
		const needle = createNeedleFilter();
		/** @type {number | null} */
		let lastNote = null;

		fitCanvas(target);
		const resizing = new ResizeObserver(() => fitCanvas(target));
		resizing.observe(target);

		const stop = onEveryFrame((now, elapsed) => {
			const reading = tuner.latest;
			const note = reading?.note ?? null;
			if (note !== lastNote) {
				history.clear();
				needle.reset();
				lastNote = note;
			}
			const heard = !!reading?.sounding && reading.cents !== null;
			const cents = heard && reading?.cents != null ? needle.next(reading.cents, elapsed) : null;
			history.add(now, cents);

			const { cents: centsText, hz: hzText } = readouts;
			if (centsText && hzText && reading?.cents != null) {
				centsText.textContent = signed(cents ?? reading.cents);
				hzText.textContent = reading.hz?.toFixed(2) ?? '';
			}
			root.classList.toggle('in-tune', cents !== null && Math.abs(cents) < IN_TUNE);
			root.style.setProperty('--trace-colour', cents === null ? '' : colourFor(cents, colours));

			const scale = target.width / Math.max(1, target.clientWidth);
			g.setTransform(scale, 0, 0, scale, 0, 0);
			drawTrace(
				g,
				{ width: target.clientWidth, height: target.clientHeight, top: HEAD_TOP, sway },
				history.points,
				now,
				colours
			);
		});

		return () => {
			stop();
			resizing.disconnect();
		};
	});
</script>

<div class="screen" class:quiet={!tuner.sounding} bind:this={screen}>
	<div class="heading">
		<div class="side">
			<span class="value" bind:this={readouts.hz}></span>
			<span class="unit">Hz</span>
		</div>
		<div class="note" aria-live="polite">
			{#if shown}
				<span class="letter">{shown.letter}</span><span class="marks"
					><span>{shown.accidental}</span><span class="octave">{shown.octave}</span></span
				>
			{:else}
				<span class="letter waiting">–</span>
			{/if}
		</div>
		<div class="side right">
			<span class="value" bind:this={readouts.cents}></span>
			<span class="unit">cents</span>
		</div>
	</div>
	{#if !shown}
		<p class="hint">Play a note</p>
	{/if}
	<div class="plot">
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
	</div>
</div>

<style>
	/* Fills the space it's given; the note and readouts grow with it */
	.screen {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr;
		container-type: size;
		min-height: 16rem;
		border-radius: var(--corner-panel);
		background: var(--tuner-screen);
		border: 1px solid var(--color-line);
		box-shadow: inset 0 2px 10px oklch(0 0 0 / calc(0.35 * var(--depth-on)));
		overflow: hidden;
		user-select: none;
	}

	.heading {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0.9rem 1rem 0;
	}
	.side {
		display: flex;
		flex-direction: column;
		font-variant-numeric: tabular-nums;
	}
	.side.right {
		align-items: flex-end;
	}
	.value {
		font-size: clamp(1.25rem, 5cqmin, 2.75rem);
		font-weight: 600;
		min-height: 1.4em;
	}
	.unit {
		font-size: clamp(0.75rem, 2.5cqmin, 1.25rem);
		color: var(--color-ink-soft);
	}

	.note {
		--letter: clamp(4.5rem, 20cqmin, 15rem);
		display: flex;
		align-items: flex-start;
		font-weight: 700;
		line-height: 1;
		transition:
			color 0.2s,
			text-shadow 0.2s;
	}
	.letter {
		font-size: var(--letter);
		letter-spacing: -0.03em;
	}
	.waiting {
		color: var(--color-ink-faint);
	}
	.marks {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: calc(var(--letter) * 0.84);
		margin: calc(var(--letter) * 0.1) 0 0 0.15rem;
		font-size: calc(var(--letter) * 0.31);
	}
	.octave {
		font-size: 0.75em;
		color: var(--color-ink-soft);
	}
	.screen:global(.in-tune) .note {
		color: var(--meter-safe);
		text-shadow: 0 0 22px color-mix(in oklab, var(--meter-safe) 60%, transparent);
	}
	.quiet .note,
	.quiet .value {
		color: var(--color-ink-soft);
	}

	.hint {
		position: absolute;
		inset: auto 0 45% 0;
		z-index: 1;
		text-align: center;
		font-size: clamp(0.9rem, 3cqmin, 1.5rem);
		color: var(--color-ink-soft);
		pointer-events: none;
	}

	/* The canvas sits over its cell, so its own pixel size never stretches the layout */
	.plot {
		position: relative;
		min-height: 0;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
