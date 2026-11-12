<script>
	/**
	 * The recording on the song's bars, like an audio region in Logic after
	 * "Apply Region Tempo to Project Tempo": its waveform (faint) and its hits
	 * (accent), bent so every beat is a quarter on the ruler. When the beats
	 * are right, the hits sit on the beat lines. Tap to play from there.
	 */
	import { waveformPath } from '../../takes/waveformPeaks.js';
	import { bentWaveform, spikesPath } from '../../transcription/recordingShape.js';
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

	/** The recording a bar at a time (the lead-in as one stretch), each drawn in its own place. */
	const pieces = $derived.by(() => {
		const { peaks, hits, grid } = transcription;
		if (!peaks || !hits || !grid) return [];
		const first = grid.bars.firstBeat;
		const stretches = [
			...(first > 0 ? [{ from: 0, to: first }] : []),
			...transcription.bars.map((bar) => ({ from: bar.firstBeat, to: bar.firstBeat + bar.beats }))
		];
		return stretches.map(({ from, to }) => {
			const wave = bentWaveform(peaks, PEAKS_PER_SECOND, grid.beats, from, to);
			const hitShape = bentWaveform(hits.values, hits.perSecond, grid.beats, from, to, hits.offset);
			return {
				left: scale.toX(from - first),
				width: scale.toX(to - first) - scale.toX(from - first),
				columns: wave.length,
				wave: waveformPath(wave),
				hits: spikesPath(hitShape)
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
		<svg
			class="hits"
			style:left="{piece.left}px"
			style:width="{piece.width}px"
			viewBox="0 0 {piece.columns} 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path d={piece.hits} />
		</svg>
	{/each}
</div>

<style>
	.lane {
		position: relative;
		height: var(--recording-lane-height);
		border-bottom: 1px solid var(--color-line);
		background-image: repeating-linear-gradient(
			to right,
			transparent 0 calc(var(--quarter) - 1px),
			var(--color-line) calc(var(--quarter) - 1px) var(--quarter)
		);
		background-position-x: var(--grid-offset);
		cursor: pointer;
	}

	.wave,
	.hits {
		position: absolute;
		top: 0;
		height: 100%;
		pointer-events: none;
	}

	.wave {
		fill: var(--color-ink-soft);
		opacity: 0.3;
	}

	.hits {
		fill: var(--color-accent);
		opacity: 0.85;
	}
</style>
