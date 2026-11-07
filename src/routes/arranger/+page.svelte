<script>
	/**
	 * The arranger page: an outline of its parts. The state they share lives
	 * in $lib/arranger/state (see Arranger.svelte.js), and each part is a
	 * component in $lib/arranger/components.
	 *
	 * The music (chart, then sheet music) fills the page. Playback sits in a
	 * bar fixed to the bottom of the screen, and the editor and mixer slide up
	 * above it, one at a time, the same on phone and desktop.
	 *
	 * It always opens on the starter song; your own songs open from the song
	 * bar. Leaving with unsaved changes asks first. If this device has a
	 * listening setup, its EQs go on as the page starts. Unsaved changes are
	 * kept as drafts (an iPhone never asks before leaving), and offered back
	 * the next time the page opens. Each song's mix is remembered on this
	 * device between saves. Your own chord shapes (My chords) load at the
	 * start too.
	 */
	import { onMount } from 'svelte';
	import { provideArranger } from '$lib/arranger/state/context.js';
	import { guardUnsavedChanges } from '$lib/arranger/state/guardUnsavedChanges.svelte.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import PlayerCard from '$lib/arranger/components/player/PlayerCard.svelte';
	import SheetMusic from '$lib/arranger/components/melody/SheetMusic.svelte';
	import PlayerBar from '$lib/arranger/components/page/PlayerBar.svelte';
	import EditDrawer from '$lib/arranger/components/editor/EditDrawer.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';
	import RestoreDraftsDialog from '$lib/arranger/components/song/RestoreDraftsDialog.svelte';
	import { startThisDevicesSetup } from '$lib/arranger/playback/eq/listeningSetup.svelte.js';
	import { keepDrafts, offerDraftsFromLastTime } from '$lib/arranger/state/drafts.svelte.js';
	import {
		keepSongMixes,
		startRememberingSongMixes
	} from '$lib/arranger/state/songMixMemory.svelte.js';
	import { loadMyChords } from '$lib/arranger/voicings/myChords.svelte.js';

	const arranger = provideArranger();
	guardUnsavedChanges(arranger.song);
	keepDrafts(arranger);
	keepSongMixes(arranger);
	// These need this browser's storage, so they wait until the page is running: your own
	// chord shapes, the EQs this device's speakers or headphones were tuned for, the mix this
	// song was left with, then any drafts
	onMount(() => {
		loadMyChords();
		startThisDevicesSetup();
		startRememberingSongMixes(arranger);
		offerDraftsFromLastTime();
		// Leaving the page: the music and the click stop with it
		return () => {
			arranger.player.metronome.turnOff();
			arranger.player.stop();
		};
	});
</script>

<svelte:head>
	<title>Bluegrass Arranger</title>
</svelte:head>

<!-- Leaves room at the bottom for the player bar and whatever drawer or keypad is over it -->
<main
	class="mx-auto max-w-5xl px-4 py-8 sm:px-8"
	style:padding-bottom={arranger.layout.bottomSpace}
>
	<h1 class="mb-6 text-3xl font-bold">Bluegrass Arranger</h1>

	<SongBar />
	<PlayerCard />
	<SheetMusic />
</main>

<PlayerBar />
<EditDrawer />
<MixerDrawer />
<RestoreDraftsDialog />
