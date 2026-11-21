<script>
	/**
	 * The recording on the song's bars, like an audio region in Logic after
	 * "Apply Region Tempo to Project Tempo": its waveform, bent so every beat
	 * is a quarter on the ruler. Tap to play from there. Like a region, it
	 * slides by its top strip (a beat at a time, so a beat always sits on
	 * the grid; its beats go with it) and trims by its ends. What's before
	 * bar 1 is shaded: it isn't played. Drawn on a canvas as wide as the
	 * view, kept beside the lane names (drawReferenceLane.js says why).
	 */
	import { WAVE_FILL, bentWaveform } from '../../transcription/referenceShape.js';
	import { beatPosition, secondsAtBeat } from '../../transcription/tempoMap.js';
	import { drawReferenceLane } from '../../transcription/drawReferenceLane.js';
	import { PEAKS_PER_SECOND } from '../../transcription/TranscriptionState.svelte.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>,
	 *   view: { left: number, width: number }
	 * }} view: the stretch of the lanes on screen (px)
	 */
	let { transcription, scale, view } = $props();

	/**
	 * The waveform as a relief map: its outline softened into a height map
	 * (highest along the middle line) and lit by a low sun from the top left.
	 */
	const RELIEF = {
		softness: 3,
		height: 2,
		lightFrom: 225,
		sunHeight: 40,
		contrast: 1.6
	};

	/** A press that moves less than this (px) is a tap. */
	const DRAG_THRESHOLD = 4;

	/** Bar 1's beat as shown: where the recording is while it's being slid. */
	const firstBeat = $derived(
		(transcription.grid?.bars.firstBeat ?? 0) - transcription.slidePreview
	);
	/** @type {{ edge: 'from' | 'to', seconds: number } | null} an end being dragged */
	let trimming = $state(null);
	/** The trimmed stretch (seconds), as it's being dragged. */
	const trim = $derived.by(() => {
		const kept = transcription.grid?.trim ?? { from: 0, to: 0 };
		return trimming ? { ...kept, [trimming.edge]: trimming.seconds } : kept;
	});
	/** The clip's ends, in the lane's pixels. */
	const clip = $derived.by(() => {
		const beats = transcription.grid?.beats ?? [];
		const x = (/** @type {number} */ seconds) =>
			scale.toX(beatPosition(beats, seconds) - firstBeat);
		return { left: x(trim.from), right: x(trim.to) };
	});
	/** Where bar 1 starts (px): the clip before it isn't played. */
	const barOneX = $derived(scale.toX(0));
	const quarterWidth = $derived(scale.toX(1) - scale.toX(0));

	/** The trimmed recording as one piece, bent onto the beats. */
	const pieces = $derived.by(() => {
		const { peaks, grid } = transcription;
		if (!peaks || !grid) return [];
		const waveScale = WAVE_FILL / peaks.reduce((loudest, peak) => Math.max(loudest, peak), 1e-6);
		const from = beatPosition(grid.beats, trim.from);
		const to = beatPosition(grid.beats, trim.to);
		return [
			{
				left: clip.left,
				width: clip.right - clip.left,
				wave: bentWaveform(peaks, PEAKS_PER_SECOND, grid.beats, from, to).map(
					(peak) => peak * waveScale
				)
			}
		];
	});

	/** @type {{ startX: number, moved: boolean } | null} */
	let press = null;

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function grab(event) {
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		press = { startX: event.clientX, moved: false };
	}

	/** @param {PointerEvent} event */
	function slide(event) {
		if (!press) return;
		const offset = event.clientX - press.startX;
		press.moved ||= Math.abs(offset) > DRAG_THRESHOLD;
		if (press.moved) transcription.slidePreview = Math.round(offset / quarterWidth);
	}

	function letGoOfSlide() {
		press = null;
		const beats = transcription.slidePreview;
		transcription.slidePreview = 0;
		transcription.slideBy(beats);
	}

	/**
	 * @param {PointerEvent & { currentTarget: HTMLElement }} event
	 * @param {'from' | 'to'} edge
	 */
	function grabEnd(event, edge) {
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		trimming = { edge, seconds: trim[edge] };
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function moveEnd(event) {
		const grid = transcription.grid;
		const lane = event.currentTarget.parentElement;
		if (!trimming || !grid || !lane) return;
		const x = event.clientX - lane.getBoundingClientRect().left;
		const seconds = secondsAtBeat(grid.beats, scale.toQuarters(x) + scale.start + firstBeat);
		trimming = {
			...trimming,
			seconds: Math.max(0, Math.min(transcription.player.duration, seconds))
		};
	}

	function letGoOfEnd() {
		const done = trimming;
		trimming = null;
		if (done) transcription.setTrim({ ...trim, [done.edge]: done.seconds });
	}

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	let height = $state(0);
	const canvasWidth = $derived(Math.max(0, Math.min(view.width, scale.width)));
	/** Where the canvas sits in the lane: kept beside the names, up to the lane's end. */
	const canvasLeft = $derived(Math.max(0, Math.min(view.left, scale.width - canvasWidth)));

	$effect(() => {
		if (!canvas || canvasWidth === 0 || height === 0) return;
		settings.appearance.waveform; // its colour
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(canvasWidth * ratio);
		canvas.height = Math.round(height * ratio);
		const context = canvas.getContext('2d');
		if (!context) return;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		drawReferenceLane(context, {
			pieces,
			from: canvasLeft,
			width: canvasWidth,
			height,
			colour: getComputedStyle(canvas).color
		});
	});

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function playFrom(event) {
		const box = event.currentTarget.getBoundingClientRect();
		transcription.seekToQuarters(scale.toQuarters(event.clientX - box.left) + scale.start);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events (Space plays; the ruler and keys move around) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lane" onclick={playFrom} use:tooltip={TIPS.transcription.referenceLane}>
	<svg class="light" aria-hidden="true">
		<filter id="reference-relief" color-interpolation-filters="sRGB">
			<feGaussianBlur in="SourceAlpha" stdDeviation={RELIEF.softness} result="height" />
			<feDiffuseLighting
				in="height"
				surfaceScale={RELIEF.height}
				lighting-color="white"
				result="light"
			>
				<feDistantLight azimuth={RELIEF.lightFrom} elevation={RELIEF.sunHeight} />
			</feDiffuseLighting>
			<feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1={RELIEF.contrast} />
		</filter>
	</svg>
	<div class="ground"></div>
	{#if transcription.timeChosen && clip.left < barOneX}
		<div
			class="unplayed"
			style:left="{clip.left}px"
			style:width="{Math.min(barOneX, clip.right) - clip.left}px"
		></div>
	{/if}
	<canvas
		bind:this={canvas}
		bind:clientHeight={height}
		class="waveform"
		class:relief={settings.appearance.dropShadows}
		style:width="{canvasWidth}px"
		aria-hidden="true"
	></canvas>
	{#if transcription.timeChosen}
		<!-- svelte-ignore a11y_no_static_element_interactions (⌘Z undoes; the bar menu fixes bars by number) -->
		<div
			class="strip"
			class:sliding={transcription.slidePreview !== 0}
			style:left="{clip.left}px"
			style:width="{clip.right - clip.left}px"
			onpointerdown={grab}
			onpointermove={slide}
			onpointerup={letGoOfSlide}
			onpointercancel={letGoOfSlide}
			onclick={(event) => event.stopPropagation()}
			use:tooltip={TIPS.transcription.slideReference}
		>
			<span class="title">{transcription.reference?.name}</span>
		</div>
	{/if}
	{#each ['from', 'to'] as edge (edge)}
		<!-- svelte-ignore a11y_no_static_element_interactions (pointer only, like a region's ends) -->
		<div
			class="end {edge}"
			style:left="{edge === 'from' ? clip.left : clip.right}px"
			onpointerdown={(event) => grabEnd(event, edge)}
			onpointermove={moveEnd}
			onpointerup={letGoOfEnd}
			onpointercancel={() => (trimming = null)}
			onclick={(event) => event.stopPropagation()}
			use:tooltip={edge === 'from' ? TIPS.transcription.trimStart : TIPS.transcription.trimEnd}
		></div>
	{/each}
</div>

<style>
	.lane {
		position: relative;
		height: 100%;
		min-height: var(--reference-lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
		cursor: pointer;
	}

	/* Stays beside the lane names while the lanes scroll (left: past the names column) */
	.waveform {
		position: sticky;
		left: var(--header-width);
		display: block;
		height: 100%;
		color: var(--color-waveform);
		filter: var(--filter-drop);
		pointer-events: none;
	}

	.waveform.relief {
		filter: url(#reference-relief) var(--filter-drop);
	}

	.light {
		position: absolute;
		width: 0;
		height: 0;
	}

	/* The clip's title strip: drag it to slide the recording along the ruler */
	.strip {
		position: absolute;
		top: 0;
		z-index: 1;
		height: 1rem;
		padding: 0 0.4rem;
		overflow: hidden;
		border-radius: 0 0 var(--corner-small) var(--corner-small);
		background: color-mix(in oklch, var(--color-waveform) 35%, var(--color-raised));
		border: 1px solid color-mix(in oklch, var(--color-waveform) 60%, var(--color-ink-soft));
		color: var(--color-ink);
		font-size: 0.65rem;
		line-height: 0.9rem;
		white-space: nowrap;
		cursor: grab;
		touch-action: none;
	}
	.strip.sliding {
		cursor: grabbing;
	}
	.title {
		position: sticky;
		left: calc(var(--header-width) + 0.4rem);
	}

	/* The clip's ends: drag to trim */
	.end {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 1;
		width: 0.6rem;
		cursor: ew-resize;
		touch-action: none;
	}
	.end.from {
		margin-left: -0.1rem;
		border-left: 3px solid var(--color-ink-soft);
	}
	.end.to {
		margin-left: -0.5rem;
		border-right: 3px solid var(--color-ink-soft);
	}

	/* Before bar 1: the recording there isn't played */
	.unplayed {
		position: absolute;
		top: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			135deg,
			color-mix(in oklch, var(--color-ink) 12%, transparent) 0 4px,
			transparent 4px 10px
		);
		pointer-events: none;
	}

	/* The line the waveform rises from */
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: var(--color-ink-faint);
		pointer-events: none;
	}
</style>
