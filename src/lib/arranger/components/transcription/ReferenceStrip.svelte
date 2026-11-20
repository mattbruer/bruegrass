<script>
	/**
	 * The whole recording on one lane: its waveform and the times,
	 * drawn from the audio itself for just the stretch on screen
	 * (drawReferenceStrip.js), so it zooms in as far as you like (its own zoom,
	 * − and +). The playhead (it follows playing, and the lane scrolls to keep
	 * it in view) and beat 1's mark sit over it. Click to move the playhead
	 * there, or drag it: by its knob, or anywhere with a mouse (a finger
	 * elsewhere scrolls the lane).
	 */
	import { drawReferenceStrip } from '../../transcription/drawReferenceStrip.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	/** Zoom 1. */
	const BASE_PIXELS_PER_SECOND = 100;
	/** Each step in or out doubles or halves it: 512 shows single samples (a lane a few million px wide, which browsers allow). */
	const ZOOMS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
	const HEIGHT = 140;

	const player = $derived(transcription.player);
	let zoom = $state(1);
	const pixelsPerSecond = $derived(BASE_PIXELS_PER_SECOND * zoom);
	const width = $derived(player.duration * pixelsPerSecond);
	const playheadX = $derived(player.time * pixelsPerSecond);

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	/** @type {HTMLDivElement | undefined} */
	let lane = $state();
	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	let scrollLeft = $state(0);
	let viewWidth = $state(0);
	let dragging = $state(false);

	// Draw what's on screen whenever it changes
	$effect(() => {
		if (!canvas || viewWidth === 0) return;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(viewWidth * ratio);
		canvas.height = Math.round(HEIGHT * ratio);
		const context = canvas.getContext('2d');
		if (!context) return;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		drawReferenceStrip(context, {
			audio: transcription.audio,
			from: scrollLeft / pixelsPerSecond,
			pixelsPerSecond,
			width: viewWidth,
			height: HEIGHT,
			colours: colours(canvas)
		});
	});

	// Keep the playhead in view while it plays
	$effect(() => {
		if (!player.playing || !scroller) return;
		if (playheadX < scroller.scrollLeft || playheadX > scroller.scrollLeft + viewWidth - 40)
			scroller.scrollLeft = playheadX - viewWidth / 3;
	});

	/**
	 * The theme's colours, read from the page (they change with the theme).
	 * @param {HTMLElement} node
	 */
	function colours(node) {
		const style = getComputedStyle(node);
		return {
			wave: style.getPropertyValue('--wave').trim(),
			line: style.getPropertyValue('--color-line').trim(),
			text: style.getPropertyValue('--color-ink-soft').trim()
		};
	}

	/**
	 * Zoom in or out, keeping the playhead where it is on screen.
	 * @param {1 | -1} step
	 */
	function zoomBy(step) {
		const index = ZOOMS.indexOf(zoom) + step;
		if (index < 0 || index >= ZOOMS.length || !scroller) return;
		const onScreen = playheadX - scroller.scrollLeft;
		zoom = ZOOMS[index];
		const target = player.time * BASE_PIXELS_PER_SECOND * zoom - onScreen;
		// The lane widens on the next frame; scroll once it has
		requestAnimationFrame(() => {
			if (scroller) scroller.scrollLeft = target;
		});
		setTimeout(() => {
			if (scroller && Math.abs(scroller.scrollLeft - target) > 1) scroller.scrollLeft = target;
		}, 50);
	}

	/** @param {PointerEvent | MouseEvent} event */
	function moveTo(event) {
		if (!lane) return;
		const box = lane.getBoundingClientRect();
		player.seek(Math.max(0, (event.clientX - box.left) / pixelsPerSecond));
	}

	/**
	 * Drag the playhead: by its knob with anything, anywhere on the lane
	 * with a mouse (a finger elsewhere scrolls the lane; a tap moves it).
	 * @param {PointerEvent & { currentTarget: HTMLElement }} event
	 */
	function startDrag(event) {
		if (event.pointerType !== 'mouse' && !event.currentTarget.classList.contains('handle')) return;
		event.stopPropagation();
		lane?.setPointerCapture(event.pointerId);
		dragging = true;
		moveTo(event);
	}

	/** @param {PointerEvent} event */
	function drag(event) {
		if (dragging) moveTo(event);
	}

	function endDrag() {
		dragging = false;
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
	<p class="text-sm text-ink-soft">↔ Drag the playhead, or click the recording, to move it.</p>
	<div class="flex items-center gap-1" role="group" aria-label="Zoom">
		<span class="mr-1 text-sm text-ink-soft">Zoom</span>
		<button
			type="button"
			class="size-9 ui-button text-lg"
			disabled={zoom === ZOOMS[0]}
			onclick={() => zoomBy(-1)}
			aria-label="Zoom out"
			use:tooltip={TIPS.transcription.laneZoomOut}>−</button
		>
		<span class="w-12 text-center text-sm tabular-nums">{zoom}×</span>
		<button
			type="button"
			class="size-9 ui-button text-lg"
			disabled={zoom === ZOOMS.at(-1)}
			onclick={() => zoomBy(1)}
			aria-label="Zoom in"
			use:tooltip={TIPS.transcription.laneZoomIn}>+</button
		>
	</div>
</div>
<div
	bind:this={scroller}
	bind:clientWidth={viewWidth}
	class="scroller ui-well"
	onscroll={() => (scrollLeft = scroller?.scrollLeft ?? 0)}
>
	<!-- svelte-ignore a11y_click_events_have_key_events (Space plays; the button below marks beat 1) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={lane}
		class="lane"
		class:dragging
		style:width="{width}px"
		style:height="{HEIGHT}px"
		onclick={moveTo}
		onpointerdown={startDrag}
		onpointermove={drag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		use:tooltip={TIPS.transcription.downbeatStrip}
	>
		<canvas
			bind:this={canvas}
			class="picture"
			style:width="{viewWidth}px"
			style:height="{HEIGHT}px"
			style:left="{scrollLeft}px"
			aria-hidden="true"
		></canvas>
		{#if transcription.downbeat !== null}
			<span class="downbeat" style:left="{transcription.downbeat * pixelsPerSecond}px"
				><b>1</b></span
			>
		{/if}
		<span class="playhead" style:left="{playheadX}px">
			<span class="handle" onpointerdown={startDrag} aria-hidden="true"></span>
		</span>
	</div>
</div>

<style>
	.scroller {
		--wave: var(--color-waveform);
		overflow-x: auto;
		overflow-y: hidden;
	}

	.lane {
		position: relative;
		cursor: crosshair;
	}

	.picture {
		position: absolute;
		top: 0;
		pointer-events: none;
	}

	.downbeat,
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		pointer-events: none;
	}

	.downbeat {
		border-left: 2px solid var(--color-accent);
	}

	.downbeat b {
		display: block;
		padding: 0 0.3rem;
		background: var(--color-accent);
		color: var(--color-raised);
		font-size: 0.75rem;
		width: fit-content;
	}

	.playhead {
		border-left: 2px solid var(--color-ink);
	}

	/* A knob on top of the playhead, to grab it by */
	.handle {
		position: absolute;
		top: 0;
		left: -0.6rem;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 0 0 50% 50%;
		background: var(--color-ink);
		cursor: grab;
		pointer-events: auto;
		touch-action: none;
	}

	.dragging,
	.dragging .handle {
		cursor: grabbing;
	}
</style>
