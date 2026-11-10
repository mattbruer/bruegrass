<script>
	/**
	 * The arranger page: an outline of its parts. The state they share lives
	 * in $lib/arranger/state (see Arranger.svelte.js), set up by this
	 * folder's +layout.svelte, and each part is a component in
	 * $lib/arranger/components.
	 *
	 * The music (the chords scrolling past, or the sheet music) fills the page. Playback sits in a
	 * bar fixed to the bottom of the screen, and the editor and mixer slide up
	 * above it, one at a time, the same on phone and desktop.
	 */
	import { useArranger } from '$lib/arranger/state/context.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import PlayerCard from '$lib/arranger/components/player/PlayerCard.svelte';
	import SheetMusic from '$lib/arranger/components/melody/SheetMusic.svelte';
	import ChartLink from '$lib/arranger/components/lyricChart/ChartLink.svelte';
	import TracksLink from '$lib/arranger/components/tracks/TracksLink.svelte';
	import MelodyReader from '$lib/arranger/components/melody/MelodyReader.svelte';
	import { shownMusicView } from '$lib/arranger/components/page/musicView.js';
	import { settings } from '$lib/settings/settings.svelte.js';

	const { layout, melody } = useArranger();

	let view = $derived(shownMusicView(settings.musicView, melody.hasNotation));
</script>

<svelte:head>
	<title>Bluegrass Arranger</title>
</svelte:head>

<!-- Leaves room at the bottom for the player bar and whatever drawer or keypad is over it -->
<main class="ui-page-width py-6" style:padding-bottom={layout.bottomSpace}>
	<div class="mb-6 flex items-center justify-between gap-3">
		<h1 class="text-3xl font-bold">Bluegrass Arranger</h1>
		<div class="flex gap-2">
			<TracksLink />
			<ChartLink />
		</div>
	</div>

	<SongBar />
	<PlayerCard showChords={view === 'chords'} />
	{#if view === 'sheet'}
		<SheetMusic />
	{:else}
		<MelodyReader />
	{/if}
</main>
