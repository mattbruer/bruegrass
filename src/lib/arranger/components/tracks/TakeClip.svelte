<script>
	/**
	 * One clip on an audio lane: a stretch of a take, with its waveform,
	 * where it plays on the song. Tap (or click) to pick it: the clip tools
	 * show above the lanes, and it gets grips. Drag a picked clip sideways to
	 * line it up with the band (a mouse drags any clip; a finger drags only a
	 * picked one, so a swipe still scrolls the lanes). Its edge grips trim it,
	 * and the handles at its top corners drag its fades in and out.
	 */
	import { useArranger } from '../../state/context.js';
	import { takeWaveform } from '../../tracks/takeWaveforms.js';
	import { PEAKS_PER_SECOND } from '../../takes/waveformPeaks.js';
	import { dragSideways } from '../../tracks/dragSideways.js';
	import { dbToGain } from '../../takes/clipLevel.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   laneClip: import('../../tracks/lanes.js').LaneClip,
	 *   takes: import('$lib/storage/songTakes.js').TakeDocument[],
	 *   place: ReturnType<typeof import('../../tracks/audioScale.js').audioScale>
	 * }}
	 *   takes: every take on the clip's lane, oldest first (for its number)
	 */
	let { laneClip, takes, place } = $props();

	const { audioEdits } = useArranger();

	/** The narrowest a clip is drawn while trimming (px). */
	const NARROWEST = 6;

	/** What's being dragged and how far (px), until the edit is made. */
	let drag = $state(
		/** @type {{ part: 'body' | 'start' | 'end' | 'fadeIn' | 'fadeOut', dx: number } | null} */ (
			null
		)
	);

	const clip = $derived(laneClip.clip);
	const picked = $derived(
		audioEdits.picked?.trackId === laneClip.take.trackId &&
			audioEdits.picked.index === laneClip.index
	);
	const number = $derived(takes.indexOf(laneClip.take) + 1);

	// Where it's drawn, in pixels across the lanes, with any drag under way
	const at = $derived({
		left: place.xAt(laneClip.start),
		right: place.xAt(laneClip.end),
		fadeIn: place.xAt(laneClip.start + clip.fadeIn) - place.xAt(laneClip.start),
		fadeOut: place.xAt(laneClip.end) - place.xAt(laneClip.end - clip.fadeOut)
	});
	const shown = $derived.by(() => {
		const dx = drag?.dx ?? 0;
		const part = drag?.part;
		const left = at.left + (part === 'body' || part === 'start' ? dx : 0);
		const right = at.right + (part === 'body' || part === 'end' ? dx : 0);
		const width = Math.max(NARROWEST, right - left);
		return {
			left: Math.min(left, at.right - NARROWEST),
			width,
			fadeIn: Math.max(0, Math.min(width, at.fadeIn + (part === 'fadeIn' ? dx : 0))),
			fadeOut: Math.max(0, Math.min(width, at.fadeOut - (part === 'fadeOut' ? dx : 0)))
		};
	});

	const peaksFrom = $derived(clip.from * PEAKS_PER_SECOND);
	const peaksWide = $derived((clip.to - clip.from) * PEAKS_PER_SECOND);
	/** Taller when it's turned up, so the level shows. */
	const heightShown = $derived(2 / Math.min(4, dbToGain(clip.gain)));
	const gainLabel = $derived(
		clip.gain === 0 ? '' : ` · ${clip.gain > 0 ? '+' : '−'}${Math.abs(clip.gain)} dB`
	);

	function pick() {
		audioEdits.pick(laneClip.take.trackId, laneClip.index);
	}

	/** @param {'body' | 'start' | 'end' | 'fadeIn' | 'fadeOut'} part */
	function dragging(part) {
		return {
			/** @param {number} dx */
			onMove: (dx) => {
				if (!picked) pick();
				drag = { part, dx };
			},
			/** @param {number} dx */
			onEnd: (dx) => {
				drag = null;
				if (dx !== 0) finish(part, dx);
			},
			onTap: pick,
			touchDrags: part !== 'body' || picked
		};
	}

	/**
	 * @param {'body' | 'start' | 'end' | 'fadeIn' | 'fadeOut'} part
	 * @param {number} dx
	 */
	function finish(part, dx) {
		const { start, end } = laneClip;
		if (part === 'body') audioEdits.move(place.secondsAt(at.left + dx) - start);
		if (part === 'start') audioEdits.trimStart(place.secondsAt(at.left + dx));
		if (part === 'end') audioEdits.trimEnd(place.secondsAt(at.right + dx));
		if (part === 'fadeIn')
			audioEdits.setFades({ fadeIn: place.secondsAt(at.left + at.fadeIn + dx) - start });
		if (part === 'fadeOut')
			audioEdits.setFades({ fadeOut: end - place.secondsAt(at.right - at.fadeOut + dx) });
	}
</script>

<div
	class="clip"
	class:picked
	class:dragging={drag !== null}
	style:left="{shown.left}px"
	style:width="{shown.width}px"
	use:dragSideways={dragging('body')}
	use:tooltip={picked ? TIPS.tracks.clipPicked : TIPS.tracks.clip}
>
	<span class="label">
		Take {number}{gainLabel}
	</span>
	{#await takeWaveform(laneClip.take) then path}
		<svg
			class="wave"
			viewBox="{peaksFrom} {-heightShown / 2} {peaksWide} {heightShown}"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path d={path} />
		</svg>
	{/await}
	{#if shown.fadeIn > 0 || shown.fadeOut > 0}
		<svg
			class="fades"
			viewBox="0 0 {shown.width} 100"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<polygon points="0,0 {shown.fadeIn},0 0,100" />
			<polygon points="{shown.width - shown.fadeOut},0 {shown.width},0 {shown.width},100" />
		</svg>
	{/if}
	{#if picked}
		<span
			class="grip start"
			use:dragSideways={dragging('start')}
			use:tooltip={TIPS.tracks.trimStart}
		></span>
		<span class="grip end" use:dragSideways={dragging('end')} use:tooltip={TIPS.tracks.trimEnd}
		></span>
		<span
			class="fade-handle"
			style:left="{shown.fadeIn}px"
			use:dragSideways={dragging('fadeIn')}
			use:tooltip={TIPS.tracks.fadeIn}
		></span>
		<span
			class="fade-handle"
			style:left="{shown.width - shown.fadeOut}px"
			use:dragSideways={dragging('fadeOut')}
			use:tooltip={TIPS.tracks.fadeOut}
		></span>
	{/if}
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
		user-select: none;
		-webkit-user-select: none;
	}

	.clip.picked {
		z-index: 1;
		outline: 2px solid var(--color-ink);
		outline-offset: 1px;
	}

	.clip.dragging {
		cursor: grabbing;
		box-shadow:
			var(--shadow-bevel),
			0 2px 8px rgb(0 0 0 / calc(0.25 * var(--depth-on))),
			var(--shadow-drop-small);
	}

	.label {
		overflow: hidden;
		padding: 0.1rem 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.wave {
		flex: 1;
		width: 100%;
		min-height: 0;
	}

	.wave path {
		fill: var(--color-accent);
	}

	.fades {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.fades polygon {
		fill: color-mix(in oklch, var(--color-surface-deep) 70%, transparent);
	}

	/* Trim grips: a bar on each edge, its touch target wider than it looks */
	.grip {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 0.5rem;
		background: var(--color-ink);
		cursor: ew-resize;
	}

	.grip.start {
		left: 0;
		border-radius: var(--corner-small) 0 0 var(--corner-small);
	}

	.grip.end {
		right: 0;
		border-radius: 0 var(--corner-small) var(--corner-small) 0;
	}

	.grip::before {
		content: '';
		position: absolute;
		inset: 0 -0.75rem;
	}

	/* Fade handles: a square at the top, where the fade ends */
	.fade-handle {
		position: absolute;
		top: -0.35rem;
		z-index: 1;
		width: 0.8rem;
		height: 0.8rem;
		margin-left: -0.4rem;
		border: 2px solid var(--color-ink);
		border-radius: 2px;
		background: var(--color-raised);
		cursor: ew-resize;
	}

	.fade-handle::before {
		content: '';
		position: absolute;
		inset: -0.6rem;
	}
</style>
