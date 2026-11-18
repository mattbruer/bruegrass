<script>
	/**
	 * The recording on the song's bars, like an audio region in Logic after
	 * "Apply Region Tempo to Project Tempo": its waveform, bent so every beat
	 * is a quarter on the ruler. Tap to play from there.
	 */
	import { waveformPath } from '../../takes/waveformPeaks.js';
	import { WAVE_FILL, bentWaveform } from '../../transcription/recordingShape.js';
	import { PEAKS_PER_SECOND } from '../../transcription/TranscriptionState.svelte.js';
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
	<div class="waveform">
		{#each pieces as piece, index (index)}
			<svg
				class="wave"
				style:left="{piece.left}px"
				style:width="{piece.width}px"
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
		height: var(--recording-lane-height);
		border-bottom: 1px solid var(--color-line);
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
</style>
