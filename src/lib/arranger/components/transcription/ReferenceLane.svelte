<script>
	/**
	 * The recording on the song's bars, like an audio region in Logic after
	 * "Apply Region Tempo to Project Tempo": its waveform, bent so every beat
	 * is a quarter on the ruler. Tap to play from there. Drawn on a canvas as
	 * wide as the view, kept beside the lane names (drawReferenceLane.js says why).
	 */
	import { WAVE_FILL, bentWaveform } from '../../transcription/referenceShape.js';
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

	/**
	 * The recording a bar at a time (the lead-in as one stretch, and whatever
	 * sounds in the room before the first beat), each drawn in its own place.
	 */
	const pieces = $derived.by(() => {
		const { peaks, grid } = transcription;
		if (!peaks || !grid) return [];
		const waveScale = WAVE_FILL / peaks.reduce((loudest, peak) => Math.max(loudest, peak), 1e-6);
		const first = grid.bars.firstBeat;
		const roomStart = scale.start + first;
		const stretches = [
			...(roomStart < 0 ? [{ from: roomStart, to: 0 }] : []),
			...(first > 0 ? [{ from: 0, to: first }] : []),
			...transcription.bars.map((bar) => ({ from: bar.firstBeat, to: bar.firstBeat + bar.beats }))
		];
		return stretches.map(({ from, to }) => ({
			left: scale.toX(from - first),
			width: scale.toX(to - first) - scale.toX(from - first),
			wave: bentWaveform(peaks, PEAKS_PER_SECOND, grid.beats, from, to).map(
				(peak) => peak * waveScale
			)
		}));
	});

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
	<canvas
		bind:this={canvas}
		bind:clientHeight={height}
		class="waveform"
		class:relief={settings.appearance.dropShadows}
		style:width="{canvasWidth}px"
		aria-hidden="true"
	></canvas>
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
