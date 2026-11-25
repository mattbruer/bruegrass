<script>
	/**
	 * The A/V lanes' videos, as big as the screen allows: what the
	 * performance will look like. The player bar plays the band (the whole
	 * song from the playhead, as on Tracks), and every tile follows it.
	 */
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import VideoWall from '$lib/arranger/components/video/VideoWall.svelte';
	import VideoLayoutPicker from '$lib/arranger/components/video/VideoLayoutPicker.svelte';
	import CameraPicker from '$lib/arranger/components/video/CameraPicker.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, loop, layout } = useArranger();
	onDestroy(loop.playThroughWhile());
</script>

<svelte:head>
	<title>Video · Bluegrass Arranger</title>
</svelte:head>

<main class="ui-page-width flex flex-col gap-4 pt-6" style:padding-bottom={layout.bottomSpace}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-bold">Video</h1>
		<div class="flex flex-wrap items-center gap-3">
			<CameraPicker disabled={recording.isRecording} />
			<VideoLayoutPicker />
			<a
				href={resolve('/arranger/tracks')}
				class="ui-button px-4 py-2 text-sm"
				use:tooltip={TIPS.video.back}>‹ Tracks</a
			>
		</div>
	</div>
	{#if recording.filmedLanes.length > 0}
		<VideoWall tallest="calc(100dvh - 19rem)" />
	{:else}
		<p class="text-sm text-ink-soft">
			No A/V lanes yet: add one on the Tracks page with + A/V, and record on it.
		</p>
	{/if}
</main>
