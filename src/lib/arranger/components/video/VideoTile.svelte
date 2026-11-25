<script>
	/**
	 * One A/V lane's video. While the lane is recording it shows the camera
	 * (mirrored, as a mirror would: the film itself is kept the right way
	 * round); otherwise the lane's films, in time with the band (followSong).
	 */
	import { followSong } from '../../video/followSong.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   lane: import('../../tracks/lanes.js').TakeLane,
	 *   camera: MediaStream | null,
	 *   timeNow: () => number,
	 *   restingAt: () => number,
	 *   filmOf: (take: import('$lib/storage/songTakes.js').TakeDocument) => Promise<string | null>
	 * }}
	 *   camera: the live camera while this lane records (null: play its films)
	 */
	let { lane, camera, timeNow, restingAt, filmOf } = $props();

	const hasFilm = $derived(lane.takes.some((take) => take.video));

	/** @param {HTMLVideoElement} video @param {MediaStream} stream */
	function showStream(video, stream) {
		video.srcObject = stream;
		return {
			/** @param {MediaStream} next */
			update: (next) => (video.srcObject = next),
			destroy: () => (video.srcObject = null)
		};
	}
</script>

<figure class="tile" use:tooltip={TIPS.video.tile}>
	{#if camera}
		<video class="film mirrored" muted playsinline autoplay use:showStream={camera}></video>
	{:else}
		<video
			class="film"
			muted
			playsinline
			preload="auto"
			use:followSong={{ clips: lane.clips, timeNow, restingAt, filmOf }}
		></video>
		{#if !hasFilm}
			<span class="empty">Record on this lane to film it</span>
		{/if}
	{/if}
	<figcaption>{lane.name}</figcaption>
</figure>

<style>
	.tile {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: var(--corner-card);
		background: var(--video-screen);
		box-shadow: var(--shadow-sunk);
	}
	.film {
		width: 100%;
		height: 100%;
		object-fit: contain; /* a phone held upright films tall: show all of it */
	}
	.mirrored {
		transform: scaleX(-1);
	}
	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-ink-soft);
	}
	figcaption {
		position: absolute;
		left: 0.5rem;
		bottom: 0.5rem;
		padding: 0.125rem 0.5rem;
		border-radius: var(--corner-small);
		font-size: 0.75rem;
		background: color-mix(in oklab, var(--video-screen), transparent 25%);
		color: var(--color-ink);
	}
</style>
