<script>
	/**
	 * The tempo the found beats say the recording plays at: a faint line beat
	 * by beat, each bar's average as a step with its number, the song's usual
	 * tempo dashed across. A bar far from it is red: listen there.
	 */
	import {
		isOffTempo,
		tempoByBar,
		tempoByBeat,
		usualTempo
	} from '../../transcription/beats/tempoCurve.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState,
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 */
	let { transcription, scale } = $props();

	/** The lane reaches this far above and below the usual tempo (a fraction); beyond it, drawn at the edge. */
	const REACH = 0.25;
	/** The lane's drawing height in viewBox units. */
	const HEIGHT = 100;

	const beats = $derived(transcription.grid?.beats ?? []);
	const firstBeat = $derived(transcription.grid?.bars.firstBeat ?? 0);
	const byBeat = $derived(tempoByBeat(beats));
	const byBar = $derived(tempoByBar(beats, transcription.bars));
	const usual = $derived(usualTempo(byBar));

	/** @param {number} beat */
	function x(beat) {
		return scale.toX(beat - firstBeat);
	}

	/** @param {number} bpm */
	function y(bpm) {
		const change = Math.max(-REACH, Math.min(REACH, bpm / usual - 1));
		return HEIGHT / 2 - (change / REACH) * (HEIGHT / 2);
	}

	const beatLine = $derived(byBeat.map((point) => `${x(point.beat)},${y(point.bpm)}`).join(' '));
	const barSteps = $derived(
		byBar.map((bar) => `M${x(bar.from)},${y(bar.bpm)}H${x(bar.to)}`).join('')
	);
</script>

<div class="lane" use:tooltip={TIPS.transcription.tempoLane}>
	{#if usual}
		<svg viewBox="0 0 {scale.width} {HEIGHT}" preserveAspectRatio="none">
			<line class="usual" x1="0" x2={scale.width} y1={y(usual)} y2={y(usual)} />
			<polyline class="by-beat" points={beatLine} />
			<path class="by-bar" d={barSteps} />
			{#each byBar.filter((bar) => isOffTempo(bar.bpm, usual)) as bar (bar.number)}
				<path class="by-bar off" d="M{x(bar.from)},{y(bar.bpm)}H{x(bar.to)}" />
			{/each}
		</svg>
		{#each byBar as bar (bar.number)}
			<span class="label" class:off={isOffTempo(bar.bpm, usual)} style:left="{x(bar.from)}px"
				>{Math.round(bar.bpm)}</span
			>
		{/each}
	{/if}
</div>

<style>
	.lane {
		position: relative;
		height: calc(4rem * var(--zoom-down));
		border-bottom: 1px solid var(--color-line);
		overflow: hidden;
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	line,
	polyline,
	path {
		fill: none;
		vector-effect: non-scaling-stroke;
	}

	.usual {
		stroke: var(--color-ink-faint);
		stroke-dasharray: 4 4;
	}

	.by-beat {
		stroke: var(--color-ink-soft);
		stroke-width: 1;
	}

	.by-bar {
		stroke: var(--color-accent);
		stroke-width: 2.5;
	}

	.by-bar.off {
		stroke: var(--color-danger);
	}

	.label {
		position: absolute;
		top: 0.1rem;
		padding-left: 0.2rem;
		font-size: 0.65rem;
		color: var(--color-ink-soft);
		pointer-events: none;
	}

	.label.off {
		color: var(--color-danger);
		font-weight: 700;
	}
</style>
