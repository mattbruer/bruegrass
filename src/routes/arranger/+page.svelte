<script>
	/**
	 * The arranger page: an outline of its parts. The state they share lives
	 * in $lib/arranger/state (see Arranger.svelte.js), and each part is a
	 * component in $lib/arranger/components.
	 *
	 * It always opens on the starter song; your own songs open from the song
	 * bar. Leaving with unsaved changes asks first.
	 */
	import { provideArranger } from '$lib/arranger/state/context.js';
	import { guardUnsavedChanges } from '$lib/arranger/state/guardUnsavedChanges.svelte.js';
	import SongBar from '$lib/arranger/components/song/SongBar.svelte';
	import PlayerCard from '$lib/arranger/components/player/PlayerCard.svelte';
	import ArrangementEditor from '$lib/arranger/components/editor/ArrangementEditor.svelte';
	import MelodyPanel from '$lib/arranger/components/melody/MelodyPanel.svelte';
	import SheetMusic from '$lib/arranger/components/melody/SheetMusic.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';

	const arranger = provideArranger();
	guardUnsavedChanges(arranger.song);
</script>

<svelte:head>
	<title>Bluegrass Arranger</title>
</svelte:head>

<!-- Leaves room at the bottom while the mixer or keypad covers it -->
<main
	class="mx-auto max-w-5xl px-4 py-8 sm:px-8"
	style:padding-bottom={arranger.layout.bottomSpace}
>
	<h1 class="mb-6 text-3xl font-bold">Bluegrass Arranger</h1>

	<SongBar />
	<PlayerCard />
	<ArrangementEditor />
	<MelodyPanel />
	<SheetMusic />
</main>

<MixerDrawer />
