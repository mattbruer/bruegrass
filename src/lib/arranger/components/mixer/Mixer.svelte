<script>
	/**
	 * The mixer: a tray of channel strips in one row (swipe sideways on a
	 * narrow screen). An instrument strip each (and one per harmony part the
	 * song has, and one per record track with a take), then the reverb aux, the
	 * master, the output stage (loudness and limiter), and a small
	 * visualiser of what reaches the speakers.
	 */
	import { mixer } from '../../playback/mixer.svelte.js';
	import ChannelStrip from './ChannelStrip.svelte';
	import ReverbStrip from './ReverbStrip.svelte';
	import MasterStrip from './MasterStrip.svelte';
	import OutputStrip from './output/OutputStrip.svelte';
	import MasterScope from './scope/MasterScope.svelte';
	import EqWindow from './eq/EqWindow.svelte';
	import InstrumentWindow from './instruments/InstrumentWindow.svelte';
	import ListeningSetupsDialog from './listening/ListeningSetupsDialog.svelte';
	import { useArranger } from '../../state/context.js';
	import { channelsInUse, isTuneChannel } from '../../melody/harmony/partChannels.js';
	import { isRecordTrack } from '../../takes/recordTracks.js';

	const { melody, recording } = useArranger();
	const tuneChannels = $derived(channelsInUse(melody.line));
	/** Melody always; a harmony part's strip only while the song has that part, a track's while it has a take. */
	const shown = $derived(
		mixer.channels.filter((channel) => {
			if (isRecordTrack(channel.id)) return recording.tracksInUse.has(channel.id);
			return channel.id === 'melody' || !isTuneChannel(channel.id) || tuneChannels.has(channel.id);
		})
	);
</script>

<section aria-label="Mixer">
	<div class="console">
		{#each shown as channel (channel.id)}
			<ChannelStrip {channel} />
		{/each}
		<ReverbStrip />
		<MasterStrip />
		<OutputStrip />
		<MasterScope />
	</div>

	<!-- (hidden on a phone on its side, to make room) -->
	<p class="hint mt-2 text-xs text-ink-soft">
		Drag a control by its cap. Tap a value, or double-click a cap, to reset it.
	</p>
</section>

<!-- One EQ window for whichever strip's EQ is open -->
<EqWindow />
<!-- What the melody or a harmony part plays on -->
<InstrumentWindow />
<!-- Listening setups: every strip's EQ, tuned for a speaker or headphones -->
<ListeningSetupsDialog />

<style>
	/* The tray, sunk into the page, with the strips standing in it */
	.console {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		/* Inside the mixer, up/down is for the faders: only sideways swipes scroll */
		touch-action: pan-x;
		border-radius: var(--corner-panel);
		background: var(--mixer-tray);
		padding: 0.85rem;
		box-shadow: var(--shadow-inset);
		color: var(--color-ink);
	}

	/* Short screens (a phone on its side): shorter faders, so the mixer fits */
	@media (max-height: 600px) {
		.console {
			--fader-length: 7rem;
			padding: 0.5rem;
		}

		.hint {
			display: none;
		}
	}
</style>
