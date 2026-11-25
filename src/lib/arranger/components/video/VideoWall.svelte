<script>
	/**
	 * The A/V lanes' videos as the finished video will look (the user's
	 * reference: a reel made in DaVinci Resolve): the song's frame (a 9:16
	 * reel by default, $lib/video/frames.js) on black, split into tiles, so
	 * many across (the song's choice, else the layout that shows the films
	 * biggest), each film filling its tile, no black between; a short last
	 * row shares out the width. Tap a tile to frame its film (zoom, move);
	 * tap anywhere else to finish. Every tile follows where the band is
	 * heard. The host says how tall it may be and where it sits.
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { wallLayout, tileRows } from '../../video/tileLayout.js';
	import { withFraming } from '../../video/songVideo.js';
	import { CENTRED } from '$lib/video/framing.js';
	import { bandHeardAt } from '../../video/bandHeardAt.js';
	import VideoTile from './VideoTile.svelte';

	/** @type {{ tallest?: string }} tallest: how tall the frame may be (CSS) */
	let { tallest = '70vh' } = $props();

	const { recording, song, player, arrangement } = useArranger();

	const lanes = $derived(recording.filmedLanes);
	const { frame, columns } = $derived(wallLayout(lanes, song.video));
	const rows = $derived(tileRows(lanes, columns));

	/** The lane whose tile is being framed (null: none). */
	let framingLane = $state(/** @type {string | null} */ (null));
	const framingNow = $derived(recording.isRecording ? null : framingLane);

	/** @param {string} laneId @param {import('$lib/video/framing.js').Framing | null} framing */
	function frameLane(laneId, framing) {
		if (framing) song.video = withFraming(song.video, laneId, framing);
		else framingLane = laneId;
	}

	/** @param {PointerEvent} event a press outside the tile being framed finishes framing */
	function finishFramingOutside(event) {
		const target = /** @type {Element} */ (event.target);
		if (framingLane && !target.closest?.('[data-framing]')) framingLane = null;
	}

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

<svelte:window
	onpointerdown={finishFramingOutside}
	onkeydown={(event) => event.key === 'Escape' && (framingLane = null)}
/>

<div
	class="frame"
	style:--frame-width={frame.width}
	style:--frame-height={frame.height}
	style:--tallest={tallest}
>
	{#each rows as row, index (index)}
		<div class="row">
			{#each row as lane (lane.id)}
				<VideoTile
					{lane}
					camera={recording.isRecording && recording.armedTrack === lane.id
						? recording.camera
						: null}
					{timeNow}
					{restingAt}
					{filmOf}
					framing={song.video.framing[lane.id] ?? CENTRED}
					framingThis={framingNow === lane.id}
					onframe={(framing) => frameLane(lane.id, framing)}
				/>
			{/each}
		</div>
	{/each}
</div>

<style>
	.frame {
		position: relative;
		display: flex;
		flex-direction: column;
		aspect-ratio: var(--frame-width) / var(--frame-height);
		width: min(100%, calc(var(--tallest) * var(--frame-width) / var(--frame-height)));
		margin-inline: auto;
		overflow: hidden;
		border-radius: var(--corner-card);
		background: var(--video-screen);
		box-shadow: var(--shadow-drop);
	}
	.row {
		display: flex;
		flex: 1;
		min-height: 0;
	}
</style>
