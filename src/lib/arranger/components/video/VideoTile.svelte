<script>
	/**
	 * One A/V lane's video, filling its tile. While the lane is recording it
	 * shows the camera (mirrored, as a mirror would: the film itself is kept
	 * the right way round); otherwise the lane's films, in time with the band
	 * (followSong). Tapped, it's being framed: drag to move the film, pinch
	 * or scroll to zoom (framing.js); the host says which tile that is.
	 */
	import { followSong } from '../../video/followSong.js';
	import { filmRect, dragged, zoomed, CENTRED } from '$lib/video/framing.js';
	import { panAndZoom } from '$lib/video/panAndZoom.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   lane: import('../../tracks/lanes.js').TakeLane,
	 *   camera: MediaStream | null,
	 *   timeNow: () => number,
	 *   restingAt: () => number,
	 *   filmOf: (take: import('$lib/storage/songTakes.js').TakeDocument) => Promise<string | null>,
	 *   framing: import('$lib/video/framing.js').Framing,
	 *   framingThis: boolean,
	 *   onframe: (framing: import('$lib/video/framing.js').Framing | null) => void
	 * }}
	 *   camera: the live camera while this lane records (null: play its films);
	 *   framingThis: this tile is being framed; onframe: a new framing (null: start framing this tile)
	 */
	let { lane, camera, timeNow, restingAt, filmOf, framing, framingThis, onframe } = $props();

	const hasFilm = $derived(lane.takes.some((take) => take.video));

	let tileWidth = $state(0);
	let tileHeight = $state(0);
	let filmWidth = $state(0);
	let filmHeight = $state(0);
	const tile = $derived({ width: tileWidth, height: tileHeight });
	const film = $derived({ width: filmWidth, height: filmHeight });
	const sized = $derived(tileWidth > 0 && tileHeight > 0 && filmWidth > 0 && filmHeight > 0);
	/** Mirrored, the film's left is on the right: frame the point the eye sees at the centre. */
	const shownFraming = $derived(camera ? { ...framing, x: 1 - framing.x } : framing);
	const rect = $derived(sized ? filmRect(tile, film, shownFraming) : null);

	/** @param {HTMLVideoElement} video @param {MediaStream} stream */
	function showStream(video, stream) {
		video.srcObject = stream;
		return {
			/** @param {MediaStream} next */
			update: (next) => (video.srcObject = next),
			destroy: () => (video.srcObject = null)
		};
	}

	function startFraming() {
		if (!framingThis && !camera) onframe(null);
	}
</script>

<div
	class="tile"
	class:framing={framingThis}
	data-framing={framingThis || undefined}
	role="button"
	tabindex="0"
	aria-label="Frame {lane.name}’s video"
	aria-pressed={framingThis}
	bind:clientWidth={tileWidth}
	bind:clientHeight={tileHeight}
	onclick={startFraming}
	onkeydown={(event) => event.key === 'Enter' && startFraming()}
	use:panAndZoom={{
		on: framingThis && sized,
		onDrag: (dx, dy) => onframe(dragged(framing, tile, film, dx, dy)),
		onZoom: (factor) => onframe(zoomed(framing, tile, film, factor))
	}}
	use:tooltip={framingThis ? TIPS.video.framing : TIPS.video.tile}
>
	{#if camera}
		<video
			class="film mirrored"
			class:placed={rect}
			style:left="{rect?.left}px"
			style:top="{rect?.top}px"
			style:width="{rect?.width}px"
			style:height="{rect?.height}px"
			bind:videoWidth={filmWidth}
			bind:videoHeight={filmHeight}
			muted
			playsinline
			autoplay
			use:showStream={camera}
		></video>
	{:else}
		<video
			class="film"
			class:placed={rect}
			style:left="{rect?.left}px"
			style:top="{rect?.top}px"
			style:width="{rect?.width}px"
			style:height="{rect?.height}px"
			bind:videoWidth={filmWidth}
			bind:videoHeight={filmHeight}
			muted
			playsinline
			preload="auto"
			use:followSong={{ clips: lane.clips, timeNow, restingAt, filmOf }}
		></video>
		{#if !hasFilm}
			<span class="empty">Record on this lane to film it</span>
		{/if}
	{/if}
	{#if framingThis}
		<button
			type="button"
			class="fit"
			onclick={(event) => (event.stopPropagation(), onframe(CENTRED))}
			use:tooltip={TIPS.video.centre}
		>
			Centre
		</button>
	{/if}
</div>

<style>
	.tile {
		position: relative;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		background: var(--video-screen);
		cursor: pointer;
	}
	.tile.framing {
		cursor: grab;
		touch-action: none; /* the fingers move the film, not the page */
	}
	.tile.framing::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 3px solid var(--color-accent);
		box-shadow: inset 0 0 0 1px var(--video-screen); /* reads on bright footage too */
		pointer-events: none;
	}
	.film {
		width: 100%;
		height: 100%;
		object-fit: cover; /* until both sizes are known */
	}
	.film.placed {
		position: absolute;
		max-width: none;
		object-fit: fill;
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
		color: var(--video-ink-soft);
	}
	.fit {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		min-height: 2.75rem;
		padding: 0 0.875rem;
		border-radius: var(--corner-small);
		font-size: 0.875rem;
		background: color-mix(in oklab, var(--video-screen), transparent 25%);
		color: var(--video-ink);
	}
</style>
