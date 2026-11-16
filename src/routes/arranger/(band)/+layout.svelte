<script>
	/**
	 * Everything the arranger's pages share: one song, one band. The
	 * arranger page and the chart page sit inside this, so moving between
	 * them keeps the song, the mix and the music playing. The player bar,
	 * the editor and mixer drawers and the received-song dialog are here
	 * too, the same on every page except those with their own player
	 * (components/page/bandPages.js), where the band stops.
	 *
	 * It opens on the song this device had open last (else the starter song),
	 * and your work saves itself as you go (state/autosave.svelte.js). If this
	 * device has a listening setup, its EQs go on as the page starts. Your own
	 * chord shapes (My chords) load at the start too, and the open song's
	 * recorded takes whenever it changes. A share link (the page opened with
	 * one, or one pasted into the address bar) or a song file dropped on the
	 * page offers its song.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { showsTheBand } from '$lib/arranger/components/page/bandPages.js';
	import { provideArranger } from '$lib/arranger/state/context.js';
	import PlayerBar from '$lib/arranger/components/page/PlayerBar.svelte';
	import EditDrawer from '$lib/arranger/components/editor/EditDrawer.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';
	import ReceiveSongDialog from '$lib/arranger/components/share/ReceiveSongDialog.svelte';
	import { startThisDevicesSetup } from '$lib/arranger/mixer/listeningSetup.svelte.js';
	import { keepWorkSaved } from '$lib/arranger/state/autosave.svelte.js';
	import { rescueOldDrafts } from '$lib/arranger/state/rescueOldDrafts.js';
	import { keepBassWithChart } from '$lib/arranger/state/bassFollowsChart.svelte.js';
	import { loadMyChords } from '$lib/arranger/voicings/myChords.svelte.js';
	import { openDroppedSongFiles } from '$lib/arranger/share/dropSongFile.js';

	let { children } = $props();

	const arranger = provideArranger();
	const showBand = $derived(showsTheBand(page.route.id));
	// A page without the band's controls has no Stop either, so the band and the click stop
	$effect(() => {
		if (showBand) return;
		arranger.player.metronome.turnOff();
		arranger.player.stop();
		arranger.layout.close();
	});
	keepWorkSaved(arranger);
	keepBassWithChart(arranger);
	// The open song's recorded takes (from this device's storage)
	$effect(() => {
		arranger.recording.showSong(arranger.song.savedId);
	});
	// These need this browser's storage, so they wait until the page is running: your own
	// chord shapes, the EQs this device's speakers or headphones were tuned for, then the song
	onMount(() => {
		loadMyChords();
		startThisDevicesSetup();
		arranger.song
			.start()
			.then(() => rescueOldDrafts(arranger))
			.catch(console.error);
		const offerSharedSong = () => arranger.receive.fromLink(location.hash);
		offerSharedSong();
		addEventListener('hashchange', offerSharedSong);
		const stopCatchingDrops = openDroppedSongFiles((file) => arranger.receive.fromFile(file));
		// Leaving the arranger: the music and the click stop with it
		return () => {
			removeEventListener('hashchange', offerSharedSong);
			stopCatchingDrops();
			arranger.player.metronome.turnOff();
			arranger.player.stop();
			arranger.transcription.dispose();
		};
	});
</script>

{@render children()}

{#if showBand}
	<div class="print:hidden">
		<PlayerBar />
		<EditDrawer />
		<MixerDrawer />
	</div>
{/if}
<ReceiveSongDialog />
