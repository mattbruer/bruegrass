<script>
	/**
	 * The open song as a lyric chart for the band to read: chords, words and
	 * barlines on sheets of paper, ready to print. The player bar is the same
	 * as the arranger's, so the band plays from here too, and Edit changes
	 * the chart as you watch. Full screen is for reading on a stand.
	 */
	import { resolve } from '$app/paths';
	import { useArranger } from '$lib/arranger/state/context.js';
	import ArrangerChart from '$lib/arranger/components/lyricChart/ArrangerChart.svelte';
	import MelodyReader from '$lib/arranger/components/melody/MelodyReader.svelte';
	import PrintButton from '$lib/components/paper/PrintButton.svelte';
	import FullScreenButton from '$lib/components/FullScreenButton.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { layout } = useArranger();

	let fullScreen = $state(false);
</script>

<svelte:head>
	<title>Chart · Bluegrass Arranger</title>
</svelte:head>

<main class="px-4 py-6 sm:px-8" style:padding-bottom={layout.bottomSpace}>
	<div class="mx-auto mb-4 flex max-w-5xl items-center gap-3 print:hidden">
		<a
			href={resolve('/arranger')}
			class="ui-button px-4 py-2 text-sm"
			use:tooltip={TIPS.chart.back}
		>
			‹ Arranger
		</a>
		<span class="mr-auto"></span>
		<FullScreenButton onOpen={() => (fullScreen = true)} />
		<PrintButton />
	</div>

	<ArrangerChart bind:fullScreen />
	<MelodyReader />
</main>

<style>
	@media print {
		main {
			padding: 0 !important;
		}
	}
</style>
