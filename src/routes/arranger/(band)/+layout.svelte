<script>
	/**
	 * Everything the arranger's pages share: one song, one band. The
	 * arranger page and the chart page sit inside this, so moving between
	 * them keeps the song, the mix and the music playing. The player bar,
	 * the editor and mixer drawers, and the restore-drafts dialog are here
	 * too, the same on every page.
	 *
	 * It always opens on the starter song; your own songs open from the song
	 * bar. Leaving with unsaved changes asks first. If this device has a
	 * listening setup, its EQs go on as the page starts. Unsaved changes are
	 * kept as drafts (an iPhone never asks before leaving), and offered back
	 * the next time the page opens. Each song's mix is remembered on this
	 * device between saves. Your own chord shapes (My chords) load at the
	 * start too, and the open song's recorded takes whenever it changes.
	 * A share link (the page opened with one, or one pasted into the address
	 * bar) offers its song once any drafts have been answered.
	 */
	import { onMount } from 'svelte';
	import { provideArranger } from '$lib/arranger/state/context.js';
	import { guardUnsavedChanges } from '$lib/arranger/state/guardUnsavedChanges.svelte.js';
	import PlayerBar from '$lib/arranger/components/page/PlayerBar.svelte';
	import EditDrawer from '$lib/arranger/components/editor/EditDrawer.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';
	import RestoreDraftsDialog from '$lib/arranger/components/song/RestoreDraftsDialog.svelte';
	import ReceiveSongDialog from '$lib/arranger/components/share/ReceiveSongDialog.svelte';
	import { startThisDevicesSetup } from '$lib/arranger/playback/eq/listeningSetup.svelte.js';
	import { keepDrafts, offerDraftsFromLastTime } from '$lib/arranger/state/drafts.svelte.js';
	import { keepBassWithChart } from '$lib/arranger/state/bassFollowsChart.svelte.js';
	import {
		keepSongMixes,
		startRememberingSongMixes
	} from '$lib/arranger/state/songMixMemory.svelte.js';
	import { loadMyChords } from '$lib/arranger/voicings/myChords.svelte.js';

	let { children } = $props();

	const arranger = provideArranger();
	guardUnsavedChanges(arranger.song);
	keepDrafts(arranger);
	keepBassWithChart(arranger);
	keepSongMixes(arranger);
	// The open song's recorded takes (from this device's storage)
	$effect(() => {
		arranger.recording.showSong(arranger.song.savedId);
	});
	// These need this browser's storage, so they wait until the page is running: your own
	// chord shapes, the EQs this device's speakers or headphones were tuned for, the mix this
	// song was left with, then any drafts
	onMount(() => {
		loadMyChords();
		startThisDevicesSetup();
		startRememberingSongMixes(arranger);
		offerDraftsFromLastTime();
		const offerSharedSong = () => arranger.receive.fromLink(location.hash);
		offerSharedSong();
		addEventListener('hashchange', offerSharedSong);
		// Leaving the arranger: the music and the click stop with it
		return () => {
			removeEventListener('hashchange', offerSharedSong);
			arranger.player.metronome.turnOff();
			arranger.player.stop();
		};
	});
</script>

{@render children()}

<div class="print:hidden">
	<PlayerBar />
	<EditDrawer />
	<MixerDrawer />
</div>
<RestoreDraftsDialog />
<ReceiveSongDialog />
