<script>
	/**
	 * The take a record track plays, as a clip with its waveform where it
	 * sits on the song. Drag it sideways to line it up with the band (it
	 * moves the take's by-ear nudge); tap it to play the track's next take.
	 */
	import { useArranger } from '../../state/context.js';
	import { takeWaveform } from '../../tracks/takeWaveforms.js';
	import { PEAKS_PER_SECOND } from '../../takes/waveformPeaks.js';
	import { dragSideways } from '../../tracks/dragSideways.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   clip: import('../../tracks/lanes.js').Clip,
	 *   takes: import('$lib/storage/songTakes.js').TakeDocument[],
	 *   scale: ReturnType<typeof import('../../tracks/trackScale.js').trackScale>
	 * }}
	 *   takes: every take on the clip's track, oldest first
	 */
	let { clip, takes, scale } = $props();

	const { recording, arrangement } = useArranger();

	/** How far it's being dragged (px), until the take is moved. */
	let dragX = $state(0);

	const number = $derived(takes.indexOf(clip.take) + 1);
	const left = $derived(scale.toX(clip.start) + dragX);
	const width = $derived(scale.toX(clip.start + clip.length) - scale.toX(clip.start));
	const peakCount = $derived(Math.ceil(clip.take.seconds * PEAKS_PER_SECOND));
	const movedMs = $derived(clip.take.nudgeMs + toMs(dragX));

	/** @param {number} pixels */
	function toMs(pixels) {
		return Math.round((scale.toQuarters(pixels) * 60000) / arrangement.bpm);
	}

	/** @param {number} dx */
	async function moveBy(dx) {
		const changeMs = toMs(dx);
		if (changeMs !== 0) await recording.nudge(clip.take, changeMs);
		dragX = 0;
	}

	function playNextTake() {
		if (takes.length < 2) return;
		recording.use(takes[number % takes.length]);
	}
</script>

<div
	class="clip"
	class:dragging={dragX !== 0}
	style:left="{left}px"
	style:width="{width}px"
	use:dragSideways={{ onMove: (dx) => (dragX = dx), onEnd: moveBy, onTap: playNextTake }}
	use:tooltip={takes.length > 1 ? TIPS.tracks.clipTakes : TIPS.tracks.clip}
>
	<span class="label">
		Take {number}{takes.length > 1 ? ` of ${takes.length}` : ''}
		{#if movedMs !== 0}
			· {Math.abs(movedMs)} ms {movedMs < 0 ? 'earlier' : 'later'}
		{/if}
	</span>
	{#await takeWaveform(clip.take) then path}
		<svg viewBox="0 -1 {peakCount} 2" preserveAspectRatio="none" aria-hidden="true">
			<path d={path} />
		</svg>
	{/await}
</div>

<style>
	.clip {
		position: absolute;
		top: 0.3rem;
		bottom: 0.3rem;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-accent);
		border-radius: var(--corner-small);
		background: var(--color-accent-soft);
		cursor: grab;
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;
	}

	.clip.dragging {
		cursor: grabbing;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
	}

	.label {
		padding: 0.1rem 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	svg {
		flex: 1;
		width: 100%;
		min-height: 0;
	}

	path {
		fill: var(--color-accent);
	}
</style>
