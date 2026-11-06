<script>
	/**
	 * The mixer: a tray of channel strips in one row (swipe sideways on a
	 * narrow screen). An instrument strip each, then the reverb aux, the
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
	import ListeningSetupsDialog from './listening/ListeningSetupsDialog.svelte';
</script>

<section aria-label="Mixer">
	<div class="console">
		{#each mixer.channels as channel (channel.id)}
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
