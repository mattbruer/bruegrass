<script>
	/**
	 * Everything the arranger's pages share: one song, one band. The
	 * arranger page and the chart page sit inside this, so moving between
	 * them keeps the song, the mix and the music playing. The player bar,
	 * the editor and mixer drawers and the received-song dialog are here
	 * too, the same on every page except those with their own controls
	 * (components/page/bandPages.js), where the band stops and only the
	 * drawers that page's own keys open are here.
	 *
	 * It opens on the song this device had open last (else the starter song),
	 * and your work saves itself as you go (state/autosave.svelte.js). If this
	 * device has a listening setup, its EQs go on as the page starts, and the
	 * open song's recorded takes load whenever it changes. A share link (the page opened with
	 * one, or one pasted into the address bar) or a song file dropped on the
	 * page offers its song.
	 */
	import InstrumentWindow from '$lib/arranger/components/mixer/instruments/InstrumentWindow.svelte';
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { showsTheBand, drawersOn } from '$lib/arranger/components/page/bandPages.js';
	import { provideArranger } from '$lib/arranger/state/context.js';
	import PlayerBar from '$lib/arranger/components/page/PlayerBar.svelte';
	import EditDrawer from '$lib/arranger/components/editor/EditDrawer.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';
	import ReceiveSongDialog from '$lib/arranger/components/share/ReceiveSongDialog.svelte';
	import { startThisDevicesSetup } from '$lib/arranger/mixer/listeningSetup.svelte.js';
	import { keepWorkSaved } from '$lib/arranger/state/autosave.svelte.js';
	import { keepBassWithChart } from '$lib/arranger/state/bassFollowsChart.svelte.js';
	import { keepTuneWithChart } from '$lib/arranger/state/tuneFollowsChart.svelte.js';
	import { openDroppedSongFiles } from '$lib/arranger/share/dropSongFile.js';
	import { registerPlayer } from '$lib/audio/players.js';

	let { children } = $props();

	const arranger = provideArranger();
	const showBand = $derived(showsTheBand(page.route.id));
	const drawers = $derived(drawersOn(page.route.id));
	// Arriving on a page without the player bar stops the band and the click; a page with its
	// own controls (Tracks) can start them again, so only the arrival counts
	$effect(() => {
		if (showBand) return;
		untrack(() => {
			arranger.player.stop();
			arranger.layout.close();
			arranger.layout.barHeight = 0; // no bar here: a drawer sits on the bottom of the screen
		});
	});
	keepWorkSaved(arranger);
	keepBassWithChart(arranger);
	keepTuneWithChart(arranger);
	// The open song's recorded takes (from this device's storage)
	$effect(() => {
		arranger.recording.showSong(arranger.song.savedId);
	});
	// These need this browser's storage, so they wait until the page is running: the EQs
	// this device's speakers or headphones were tuned for, then the song
	onMount(() => {
		startThisDevicesSetup();
		arranger.song.start().catch(console.error);
		const offerSharedSong = () => arranger.receive.fromLink(location.hash);
		offerSharedSong();
		addEventListener('hashchange', offerSharedSong);
		const stopCatchingDrops = openDroppedSongFiles((file) => arranger.receive.fromFile(file));
		const signOff = registerPlayer(() => {
			arranger.player.stop();
			if (arranger.transcription.player.playing) arranger.transcription.player.pause();
		});
		// Leaving the arranger: the music and the click stop with it
		return () => {
			removeEventListener('hashchange', offerSharedSong);
			stopCatchingDrops();
			signOff();
			arranger.player.stop();
			arranger.transcription.dispose();
		};
	});
</script>

{@render children()}

<div class="print:hidden">
	{#if showBand}<PlayerBar />{/if}
	{#if drawers.includes('edit')}<EditDrawer />{/if}
	{#if drawers.includes('mixer')}<MixerDrawer />{/if}
</div>
<InstrumentWindow />
<ReceiveSongDialog />
