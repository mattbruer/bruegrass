<script>
	/**
	 * The player: controls on top, the loop below them, how chords are shown
	 * and the key, then the chart scrolling past while it plays.
	 */
	import { useArranger } from '../../state/context.js';
	import PlayerToolbar from './PlayerToolbar.svelte';
	import LoopBar from './LoopBar.svelte';
	import ChordDisplayToggle from './ChordDisplayToggle.svelte';
	import KeySummary from './KeySummary.svelte';
	import ArrangementStrip from '../chart/ArrangementStrip.svelte';

	const { arrangement, loop, player } = useArranger();
</script>

<section class="mb-10 ui-card p-4 sm:p-5" aria-label="Player">
	<PlayerToolbar />
	<LoopBar />

	<div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
		<ChordDisplayToggle />
		<KeySummary />
	</div>

	{#if arrangement.sections.length > 0}
		<ArrangementStrip
			sections={loop.sectionsToPlay}
			playback={player.playback}
			label={arrangement.chordName}
		/>
	{:else}
		<p class="ui-well p-6 text-center text-ink-soft">
			Write an arrangement below and it will show up here.
		</p>
	{/if}

	{#if player.problem}
		<p class="mt-3 text-sm text-danger">{player.problem}</p>
	{/if}
</section>
