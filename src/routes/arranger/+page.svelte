<script>
	/**
	 * The arranger page: an outline of its parts. The state they share lives
	 * in $lib/arranger/state (see Arranger.svelte.js), and each part is a
	 * component in $lib/arranger/components.
	 */
	import { provideArranger } from '$lib/arranger/state/context.js';
	import { keepArrangementSaved } from '$lib/arranger/state/autosave.svelte.js';
	import PlayerCard from '$lib/arranger/components/player/PlayerCard.svelte';
	import ArrangementEditor from '$lib/arranger/components/editor/ArrangementEditor.svelte';
	import MelodyPanel from '$lib/arranger/components/melody/MelodyPanel.svelte';
	import SheetMusic from '$lib/arranger/components/melody/SheetMusic.svelte';
	import MixerDrawer from '$lib/arranger/components/mixer/MixerDrawer.svelte';

	const arranger = provideArranger();
	keepArrangementSaved(arranger);
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

	<PlayerCard />
	<ArrangementEditor />
	<MelodyPanel />
	<SheetMusic />
</main>

<MixerDrawer />
