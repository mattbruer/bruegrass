<script>
	/**
	 * The open song as a lyric chart on paper: the arranger's chords and
	 * words, its title and settings. While the band plays, the bar being
	 * played lights up and its page comes into view. In full screen, the
	 * pages fill the screen, turn with a tap on either side or the keys
	 * (page-turner pedals), and a small Play/Stop sits in the corner.
	 */
	import { useArranger } from '../../state/context.js';
	import { readLyrics } from '../../chart/sectionLyrics.js';
	import { chartSections } from '../../lyricChart/chartRows.js';
	import { chartBlocks } from '../../lyricChart/chartBlocks.js';
	import { chartDetails } from '../../lyricChart/chartDetails.js';
	import { followPlayback } from '../../lyricChart/followPlayback.js';
	import PaperPages from '$lib/components/paper/PaperPages.svelte';
	import FullScreen from '$lib/components/FullScreen.svelte';
	import { turnPages } from '$lib/components/paper/turnPages.js';
	import ChartBlock from './ChartBlock.svelte';
	import PlayIcon from '../icons/PlayIcon.svelte';
	import StopIcon from '../icons/StopIcon.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ fullScreen?: boolean }} */
	let { fullScreen = $bindable(false) } = $props();

	/** @type {PaperPages | undefined} */
	let pages = $state();

	const arranger = useArranger();
	const { arrangement, player, layout } = arranger;

	let chart = $derived(chartSections(arrangement.sections, readLyrics(arrangement.text)));
	let blocks = $derived(chartBlocks(chart.sections));
	let bars = $derived(chart.sections.flatMap((section) => section.rows.flat()));
	let header = $derived({
		title: arranger.song.name || arranger.title || 'Untitled',
		details: chartDetails(arrangement)
	});
</script>

<div class="print:hidden">
	{#if arrangement.error}
		<p class="mb-2 text-sm text-danger">{arrangement.error}</p>
	{/if}
	{#each chart.problems as problem (problem)}
		<p class="mb-2 text-sm text-danger">{problem}</p>
	{/each}
</div>

<FullScreen bind:open={fullScreen}>
	<div
		use:followPlayback={{ timeNow: player.melodyTimeNow, bars }}
		use:turnPages={{
			next: () => pages?.next(),
			previous: () => pages?.previous(),
			on: fullScreen
		}}
	>
		<PaperPages bind:this={pages} {blocks} coveredBelow={fullScreen ? 0 : layout.barHeight}>
			{#snippet block(/** @type {import('../../lyricChart/chartBlocks.js').ChartBlock} */ item)}
				<ChartBlock block={item} {header} label={arrangement.chordName} />
			{/snippet}
		</PaperPages>
	</div>

	{#snippet corner()}
		<button
			type="button"
			class="h-11 w-11 ui-button rounded-full p-2"
			aria-label={player.isPlaying ? 'Stop' : 'Play'}
			use:tooltip={TIPS.fullScreen.play}
			onclick={() => (player.isPlaying ? player.stop() : player.play())}
		>
			{#if player.isPlaying}<StopIcon />{:else}<PlayIcon />{/if}
		</button>
	{/snippet}
</FullScreen>
