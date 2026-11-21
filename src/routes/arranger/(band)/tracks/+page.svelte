<script>
	/**
	 * The open song as tracks, like a DAW, laid out like Transcribe: a
	 * control bar (Play, Record, the click and the tempo), then the track
	 * grid: the band's parts and the audio lanes you record on, on the
	 * song's bars at its steady tempo. No player bar here: this page has its
	 * own controls, and each lane its own mute, solo and volume. The band
	 * plays the whole song once from the playhead; the arranger's loop is
	 * kept for when you go back.
	 */
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import TracksControls from '$lib/arranger/components/tracks/TracksControls.svelte';
	import TracksView from '$lib/arranger/components/tracks/TracksView.svelte';
	import RecordingNotes from '$lib/arranger/components/recording/RecordingNotes.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { recording, loop } = useArranger();
	onDestroy(loop.playThroughWhile());
</script>

<svelte:head>
	<title>Tracks · Bluegrass Arranger</title>
</svelte:head>

<main class="ui-page-width flex flex-col gap-4 pt-6 pb-16">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-bold">Tracks</h1>
		<a
			href={resolve('/arranger')}
			class="ui-button px-4 py-2 text-sm"
			use:tooltip={TIPS.tracks.back}
		>
			‹ Arranger
		</a>
	</div>
	<SongBar />
	<TracksControls />
	<RecordingNotes />
	<TracksView />
	{#if recording.lanes.length === 0}
		<p class="text-sm text-ink-soft">
			Add an audio lane to record on: a voice, or a real instrument along with the band.
		</p>
	{/if}
</main>
