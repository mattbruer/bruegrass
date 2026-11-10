<script>
	/**
	 * The open song as tracks, like a DAW: a lane for each part of the band
	 * and each recorded take, on one timeline. The player bar is the same as
	 * the arranger's, so the band plays from here too, and a take dragged
	 * along its lane plays where you left it.
	 */
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import TracksView from '$lib/arranger/components/tracks/TracksView.svelte';
	import MelodyReader from '$lib/arranger/components/melody/MelodyReader.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { layout } = useArranger();
</script>

<svelte:head>
	<title>Tracks · Bluegrass Arranger</title>
</svelte:head>

<main class="ui-page-width py-6" style:padding-bottom={layout.bottomSpace}>
	<div>
		<div class="mb-4 flex items-center gap-3">
			<a
				href={resolve('/arranger')}
				class="ui-button px-4 py-2 text-sm"
				use:tooltip={TIPS.tracks.back}
			>
				‹ Arranger
			</a>
		</div>
		<TracksView />
	</div>
	<MelodyReader />
</main>
