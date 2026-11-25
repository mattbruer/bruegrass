<script>
	/**
	 * The A/V lanes' videos as the finished video will look: the song's
	 * frame (a 9:16 reel by default, $lib/video/frames.js), filled with
	 * tiles, so many across (the song's choice, else the layout that crops
	 * the films least), each film cropped to fill its tile. The bands the
	 * platform's own buttons cover are shaded. Every tile follows where the
	 * band is heard. The host says how tall it may be and where it sits.
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { wallLayout } from '../../video/tileLayout.js';
	import { bandHeardAt } from '../../video/bandHeardAt.js';
	import VideoTile from './VideoTile.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ tallest?: string }} tallest: how tall the frame may be (CSS) */
	let { tallest = '70vh' } = $props();

	const { recording, song, player, arrangement } = useArranger();

	const lanes = $derived(recording.filmedLanes);
	const { frame, columns, rows } = $derived(wallLayout(lanes, song.video));

	/** The band's audio context (Tone loads after the page), for its output delay. */
	let audio = /** @type {BaseAudioContext | null} */ (null);
	onMount(() => {
		import('tone').then((Tone) => (audio = Tone.getContext().rawContext));
	});

	const timeNow = () => (audio ? bandHeardAt(player.melodyTimeNow, arrangement.clock, audio) : NaN);
	const restingAt = () => arrangement.clock.secondsAt(player.resumeAt);
	/** @param {import('$lib/storage/songTakes.js').TakeDocument} take */
	const filmOf = (take) => recording.filmOf(take);
</script>

<div
	class="frame"
	style:--frame-width={frame.width}
	style:--frame-height={frame.height}
	style:--tallest={tallest}
>
	<div class="tiles" style:--columns={columns} style:--rows={rows}>
		{#each lanes as lane (lane.id)}
			<VideoTile
				{lane}
				camera={recording.isRecording && recording.armedTrack === lane.id ? recording.camera : null}
				{timeNow}
				{restingAt}
				{filmOf}
			/>
		{/each}
	</div>
	{#if frame.covered.top}
		<div
			class="covered top"
			style:height="{(frame.covered.top / frame.height) * 100}%"
			use:tooltip={TIPS.video.covered}
		>
			<span>{frame.covered.topSays}</span>
		</div>
	{/if}
	{#if frame.covered.bottom}
		<div
			class="covered bottom"
			style:height="{(frame.covered.bottom / frame.height) * 100}%"
			use:tooltip={TIPS.video.covered}
		>
			<span>{frame.covered.bottomSays}</span>
		</div>
	{/if}
</div>

<style>
	.frame {
		position: relative;
		aspect-ratio: var(--frame-width) / var(--frame-height);
		width: min(100%, calc(var(--tallest) * var(--frame-width) / var(--frame-height)));
		margin-inline: auto;
		overflow: hidden;
		border-radius: var(--corner-card);
		background: var(--video-screen);
		box-shadow: var(--shadow-drop);
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
		gap: 2px;
		height: 100%;
	}
	.covered {
		position: absolute;
		inset-inline: 0;
		display: grid;
		place-items: center;
		padding-inline: 0.5rem;
		background: color-mix(in oklab, var(--video-screen), transparent 55%);
		border-block: 1px dashed color-mix(in oklab, var(--color-ink), transparent 60%);
	}
	/* Each label by its dashed line, clear of the tiles' name tags in the corners */
	.covered.top {
		top: 0;
		border-top: none;
		align-items: end;
		padding-bottom: 0.25rem;
	}
	.covered.bottom {
		bottom: 0;
		border-bottom: none;
		align-items: start;
		padding-top: 0.25rem;
	}
	.covered span {
		padding: 0.125rem 0.5rem;
		border-radius: var(--corner-small);
		font-size: 0.6875rem;
		text-align: center;
		background: color-mix(in oklab, var(--video-screen), transparent 20%);
		color: var(--color-ink-soft);
	}
</style>
