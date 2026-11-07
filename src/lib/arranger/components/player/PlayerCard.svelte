<script>
	/**
	 * The chart: capo, key and how chords are shown, the loop, then the
	 * arrangement scrolling past while it plays. Play, Stop and tempo are in
	 * the player bar at the bottom of the screen.
	 */
	import { useArranger } from '../../state/context.js';
	import CapoSelect from './CapoSelect.svelte';
	import KeySelect from './KeySelect.svelte';
	import LoopBar from './LoopBar.svelte';
	import ChordDisplayToggle from './ChordDisplayToggle.svelte';
	import KeySummary from './KeySummary.svelte';
	import ArrangementStrip from '../chart/ArrangementStrip.svelte';

	const { arrangement, loop, player } = useArranger();
</script>

<section class="mb-8 ui-card p-4 sm:p-5" aria-label="Chart">
	<div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
		<CapoSelect />
		<KeySelect />
		<ChordDisplayToggle />
		<KeySummary />
	</div>

	<LoopBar />

	{#if arrangement.sections.length > 0}
		<ArrangementStrip
			sections={loop.sectionsToPlay}
			playback={player.playback}
			label={arrangement.chordName}
		/>
	{:else}
		<p class="ui-well p-6 text-center text-ink-soft">
			Press Edit to write an arrangement, and it will show up here.
		</p>
	{/if}

	{#if player.problem}
		<p class="mt-3 text-sm text-danger">{player.problem}</p>
	{/if}
</section>
