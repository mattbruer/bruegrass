<script>
	/**
	 * The A/V lanes' videos as the finished video will look (the user's
	 * reference: a reel made in DaVinci Resolve): the song's frame (a 9:16
	 * reel by default, $lib/video/frames.js) on black, split into tiles, so
	 * many across (the song's choice, else the layout that shows the films
	 * biggest), each film whole at its own shape, the space left over black.
	 * Every tile follows where the band is heard. The host says how tall it
	 * may be and where it sits.
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { wallLayout } from '../../video/tileLayout.js';
	import { bandHeardAt } from '../../video/bandHeardAt.js';
	import VideoTile from './VideoTile.svelte';

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
		gap: 0.5%; /* a thin black line where films would touch */
		height: 100%;
	}
</style>
