<script>
	/**
	 * The EQ graph: grid, live analyser (the strip's sound after the EQ),
	 * response curve, and a dot per band. Grab a dot to move its band:
	 * across for frequency, up and down for gain (cuts only move across).
	 * Grabbing a dot selects its band, for the exact controls below.
	 */
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { audioTaps } from '../../../playback/mixerGraph.svelte.js';
	import { onEveryFrame } from '../../../playback/analysis/frameLoop.js';
	import { EQ_BANDS, isCut } from '../../../playback/eq/eqBands.js';
	import { prepareCanvas } from '../scope/canvas.js';
	import {
		HANDLE_RADIUS,
		drawAnalyser,
		drawGrid,
		drawHandles,
		drawResponse,
		eqColours,
		handlePositions
	} from './drawEqGraph.js';
	import { frequencyAtX, gainAtY } from './eqGraphScale.js';

	/** How close (in px) a touch must land to a dot to grab it: bigger than the dot, for fingers. */
	const GRAB_DISTANCE = HANDLE_RADIUS * 3;
	/** Until the audio exists, draw the curve for a typical sample rate. */
	const FALLBACK_SAMPLE_RATE = 48000;

	/**
	 * @type {{
	 *   eq: import('../../../playback/eq/eqBands.js').EqSettings,
	 *   stripId: string,
	 *   selectedBandId: string
	 * }}
	 */
	let { eq, stripId, selectedBandId = $bindable() } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	/** The band being dragged, if any. */
	let draggingIndex = -1;

	let colours = $derived.by(() => {
		JSON.stringify(settings.appearance); // follow theme changes
		return canvas ? eqColours(canvas) : null;
	});

	onMount(() =>
		onEveryFrame(() => {
			if (!canvas || !colours) return;
			const { context, width, height } = prepareCanvas(canvas);
			const analyser = audioTaps.current?.afterEq.get(stripId);
			const sampleRate = analyser?.sampleRate ?? FALLBACK_SAMPLE_RATE;

			drawGrid(context, width, height, colours);
			if (analyser) drawAnalyser(context, analyser.read(), sampleRate, width, height, colours);
			drawResponse(context, eq, sampleRate, width, height, colours);
			drawHandles(context, eq, selectedBandId, width, height, colours);
		})
	);

	/** @param {PointerEvent} event */
	function grab(event) {
		if (!canvas) return;
		const point = pointOnCanvas(event);
		const nearest = handlePositions(eq, canvas.clientWidth, canvas.clientHeight)
			.map((handle) => ({
				...handle,
				distance: Math.hypot(handle.x - point.x, handle.y - point.y)
			}))
			.sort((a, b) => a.distance - b.distance)[0];
		if (!nearest || nearest.distance > GRAB_DISTANCE) return;

		event.preventDefault();
		canvas.setPointerCapture(event.pointerId);
		draggingIndex = nearest.index;
		selectedBandId = nearest.id;
		eq.bands[nearest.index].on = true; // grabbing a band switches it on, as in Logic
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (draggingIndex < 0 || !canvas) return;
		const point = pointOnCanvas(event);
		const band = eq.bands[draggingIndex];
		band.frequency = Math.round(frequencyAtX(point.x, canvas.clientWidth));
		if (!isCut(EQ_BANDS[draggingIndex].shape)) {
			band.gain = Math.round(gainAtY(point.y, canvas.clientHeight) * 10) / 10;
		}
	}

	function release() {
		draggingIndex = -1;
	}

	/** @param {PointerEvent} event */
	function pointOnCanvas(event) {
		const box = /** @type {HTMLCanvasElement} */ (canvas).getBoundingClientRect();
		return { x: event.clientX - box.left, y: event.clientY - box.top };
	}
</script>

<canvas
	bind:this={canvas}
	class="graph"
	aria-label="EQ curve: drag a band's dot to move it"
	onpointerdown={grab}
	onpointermove={drag}
	onpointerup={release}
	onpointercancel={release}
></canvas>

<style>
	.graph {
		display: block;
		width: 100%;
		height: 14rem;
		border-radius: var(--corner-small);
		background: var(--mixer-tray);
		box-shadow: var(--shadow-inset-small);
		touch-action: none; /* drags on the graph move bands, not the page */
	}
</style>
