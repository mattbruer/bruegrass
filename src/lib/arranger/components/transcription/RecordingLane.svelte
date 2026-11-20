<script>
	/**
	 * The recording on the song's bars, like an audio region in Logic after
	 * "Apply Region Tempo to Project Tempo": its waveform, bent so every beat
	 * is a quarter on the ruler. Tap to play from there.
	 */
	import { waveformPath } from '../../takes/waveformPeaks.js';
	import { WAVE_FILL, bentWaveform } from '../../transcription/recordingShape.js';
	import { PEAKS_PER_SECOND } from '../../transcription/TranscriptionState.svelte.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, scale } = $props();

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
		return stretches.map(({ from, to }) => {
			const wave = bentWaveform(peaks, PEAKS_PER_SECOND, grid.beats, from, to);
			return {
				left: scale.toX(from - first),
				width: scale.toX(to - first) - scale.toX(from - first),
				columns: wave.length,
				wave: waveformPath(wave.map((peak) => peak * waveScale))
			};
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
<div class="lane" onclick={playFrom} use:tooltip={TIPS.transcription.recordingLane}>
	<svg class="light" aria-hidden="true">
		<filter id="recording-relief" color-interpolation-filters="sRGB">
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
	<div class="waveform" class:relief={settings.appearance.dropShadows}>
		{#each pieces as piece, index (index)}
			<svg
				class="wave"
				style:left="{piece.left}px"
				style:width="{piece.width + 1}px"
				viewBox="0 -1 {piece.columns} 2"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path d={piece.wave} />
			</svg>
		{/each}
	</div>
</div>

<style>
	.lane {
		position: relative;
		min-height: var(--recording-lane-height);
		border-bottom: var(--lane-divider, 1px solid var(--color-line));
		cursor: pointer;
	}

	.wave {
		position: absolute;
		top: 0;
		height: 100%;
		pointer-events: none;
	}

	/* One shadow for the whole waveform: a shadow per bar darkened every join */
	.waveform {
		position: absolute;
		inset: 0;
		filter: var(--filter-drop);
		pointer-events: none;
	}

	.wave {
		fill: var(--color-waveform);
	}

	.waveform.relief {
		filter: url(#recording-relief) var(--filter-drop);
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
