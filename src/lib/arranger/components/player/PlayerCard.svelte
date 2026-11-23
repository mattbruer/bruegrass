<script>
	/**
	 * The chart: capo, key and how chords are shown, the loop, then the
	 * arrangement scrolling past while it plays (or, with the sheet music
	 * showing instead, only the controls). Play, Stop and tempo are in the
	 * player bar at the bottom of the screen.
	 */
	import { useArranger } from '../../state/context.js';
	import CapoSelect from './CapoSelect.svelte';
	import KeySelect from './KeySelect.svelte';
	import LoopBar from './LoopBar.svelte';
	import ChordDisplayToggle from './ChordDisplayToggle.svelte';
	import KeySummary from './KeySummary.svelte';
	import ArrangementStrip from '../chart/ArrangementStrip.svelte';
	import ChordDialogs from '../chordEdit/ChordDialogs.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { musicViewsFor, shownMusicView } from '../page/musicView.js';

	/** @type {{ showChords: boolean }} */
	let { showChords } = $props();

	const { arrangement, layout, loop, melody, player } = useArranger();

	/** A bar and beat tapped on the strip where no chord is written (null: none). */
	/** @type {import('../../chart/chordSpot.js').ChordSpot | null} */
	let spotOn = $state(null);
	/** The chord tapped on the strip (null: none). */
	/** @type {import('../../chart/chartAnalysis.js').ChordPlace | null} */
	let editOn = $state(null);
</script>

<section class="mb-4 ui-card p-4" aria-label="Chart">
	<div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
		<TabSwitch
			tabs={musicViewsFor(melody.hasNotation)}
			bind:value={
				() => shownMusicView(layout.musicView, melody.hasNotation),
				(id) => (layout.musicView = /** @type {import('../page/musicView.js').MusicView} */ (id))
			}
			tips={TIPS.player.musicView}
			label="Show"
		/>
		<CapoSelect />
		<KeySelect />
		{#if showChords}
			<ChordDisplayToggle />
		{/if}
		<KeySummary />
	</div>

	<LoopBar />

	{#if showChords && arrangement.sections.length > 0}
		<ArrangementStrip
			sections={loop.sectionsToPlay}
			playback={player.playback}
			restAt={player.resumeInPass()}
			label={arrangement.chordName}
			onChordTap={(place) => (editOn = place)}
			onSpotTap={(spot) => (spotOn = spot)}
		/>
		<ChordDialogs bind:place={editOn} bind:spot={spotOn} />
	{:else if showChords}
		<p class="ui-well p-6 text-center text-ink-soft">
			Press Edit to write an arrangement, and it will show up here.
		</p>
	{/if}

	{#if player.problem}
		<p class="mt-3 text-sm text-danger">{player.problem}</p>
	{/if}
</section>
