<script>
	/**
	 * The A/V lanes' videos, tiled: so many across (the song's choice,
	 * VideoLayoutPicker), as many rows as that takes. Every tile follows
	 * where the band is heard. The host decides how wide it is and where it
	 * sits (under the tracks, or filling the Video page).
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { columnsFor } from '../../video/tileLayout.js';
	import { bandHeardAt } from '../../video/bandHeardAt.js';
	import VideoTile from './VideoTile.svelte';

	const { recording, song, player, arrangement } = useArranger();

	const lanes = $derived(recording.filmedLanes);
	const columns = $derived(columnsFor(lanes.length, song.video.columns));

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

<div class="wall" style:--columns={columns}>
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

<style>
	.wall {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		gap: 0.5rem;
	}
</style>
