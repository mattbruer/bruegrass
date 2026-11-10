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
	import Faceplate from '$lib/components/Faceplate.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { MUSIC_VIEWS } from '../page/musicView.js';

	/** @type {{ showChords: boolean }} */
	let { showChords } = $props();

	const { arrangement, loop, melody, player } = useArranger();
</script>

<div class="mb-4">
	<Faceplate look={settings.playerLook} label="Chart">
		<div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
			{#if melody.hasNotation}
				<TabSwitch
					tabs={MUSIC_VIEWS}
					bind:value={settings.musicView}
					tips={TIPS.player.musicView}
					label="Show"
				/>
			{/if}
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
				label={arrangement.chordName}
			/>
		{:else if showChords}
			<p class="ui-well p-6 text-center text-ink-soft">
				Press Edit to write an arrangement, and it will show up here.
			</p>
		{/if}

		{#if player.problem}
			<p class="mt-3 text-sm text-danger">{player.problem}</p>
		{/if}
	</Faceplate>
</div>
