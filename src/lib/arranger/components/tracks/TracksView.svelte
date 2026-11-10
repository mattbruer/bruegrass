<script>
	/**
	 * The song as tracks, like a DAW: a bar ruler, a lane for each part of
	 * the band and for each record track with takes, and a playhead that
	 * follows the band. The lanes scroll sideways together under their
	 * names, which stay put.
	 */
	import { useArranger } from '../../state/context.js';
	import { bandLanes, takeLanes } from '../../tracks/lanes.js';
	import { rulerBars, rulerSpan } from '../../tracks/ruler.js';
	import { trackScale } from '../../tracks/trackScale.js';
	import { followPlayhead } from '../../tracks/followPlayhead.js';
	import TrackRuler from './TrackRuler.svelte';
	import LaneHeader from './LaneHeader.svelte';
	import BlockLane from './BlockLane.svelte';
	import TakeClip from './TakeClip.svelte';

	const { arrangement, melody, recording, player } = useArranger();

	/** The names column (px); the lanes scroll under it. */
	const HEADER_WIDTH = 104;

	const bars = $derived(rulerBars(arrangement.sections));
	const band = $derived(
		bandLanes({
			sections: arrangement.sections,
			pitchShift: arrangement.pitchShift,
			melody: melody.line
		})
	);
	const takes = $derived(takeLanes(recording.takes, arrangement.bpm));
	const scale = $derived(trackScale(spanWithClips(rulerSpan(bars), takes)));

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();

	/**
	 * The ruler's span, widened for a take that runs past the end.
	 * @param {{ start: number, end: number }} span
	 * @param {import('../../tracks/lanes.js').TakeLane[]} lanes
	 */
	function spanWithClips(span, lanes) {
		const clipEnds = lanes.map((lane) => (lane.clip ? lane.clip.start + lane.clip.length : 0));
		return { start: span.start, end: Math.max(span.end, ...clipEnds) };
	}
</script>

<div class="scroller" bind:this={scroller}>
	<div class="tracks" style:--header-width="{HEADER_WIDTH}px" style:--lanes-width="{scale.width}px">
		<div class="corner"></div>
		<TrackRuler {bars} {scale} />

		{#each band as lane (lane.id)}
			<LaneHeader {lane} />
			<BlockLane {lane} {scale} />
		{/each}

		{#each takes as lane (lane.id)}
			<LaneHeader {lane} />
			<div class="take-lane">
				{#if lane.clip}
					<TakeClip clip={lane.clip} takes={lane.takes} {scale} />
				{/if}
			</div>
		{/each}

		<div
			class="playhead"
			hidden
			use:followPlayhead={{
				timeNow: player.melodyTimeNow,
				toX: scale.toX,
				scroller,
				headerWidth: HEADER_WIDTH
			}}
		></div>
	</div>
</div>

{#if takes.length === 0}
	<p class="hint">Record along with the band (the Record key) and your takes show here.</p>
{/if}

<style>
	.scroller {
		overflow-x: auto;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-card);
		background: var(--color-surface-deep);
	}

	.tracks {
		--lane-height: 3.5rem;
		--take-lane-height: 4.5rem;
		position: relative;
		display: grid;
		grid-template-columns: var(--header-width) var(--lanes-width);
		width: max-content;
	}

	.corner {
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-line);
	}

	.take-lane {
		position: relative;
		height: var(--take-lane-height);
		border-bottom: 1px solid var(--color-line);
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--header-width);
		z-index: 1;
		width: 2px;
		margin-left: -1px;
		background: var(--color-danger);
		pointer-events: none;
	}

	.playhead[hidden] {
		display: none;
	}

	.hint {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}
</style>
