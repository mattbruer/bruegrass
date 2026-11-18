<script>
	/**
	 * Transcribe's control bar, centred: where you are (play, start over, a
	 * bar back or forward, the clock) and how it sounds (speed with the pitch
	 * kept, Count along as the metronome: a click on every beat, higher
	 * on ONE, and the tuner). + Marker and Zoom are beside the grid's ruler, and the
	 * recording's own settings in its lane's menu (RecordingMenu). It stays
	 * in view under the top bar, so Play is at hand while you write in the
	 * piano roll below. Only in the workspace: placing beat 1 has its own few
	 * controls.
	 */
	import PlayPauseGlyph from '../icons/PlayPauseGlyph.svelte';
	import TransportGlyph from '../icons/TransportGlyph.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import CountAlongButton from './CountAlongButton.svelte';
	import { soundById } from '$lib/slowDowner/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import PlayClock from './PlayClock.svelte';
	import TunerButton from '$lib/tuner/TunerButton.svelte';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);

	$effect(() => {
		transcription.player.setFrameSeconds(soundById(settings.transcribe.sound).frameSeconds);
	});

	function togglePlay() {
		if (player.playing) {
			player.pause();
			transcription.cycle.backToStart();
		} else {
			transcription.cycle.startFromCycle();
			player.play();
		}
	}

	/** Space plays and pauses wherever focus is, except while typing in a text box. */
	const TYPING =
		'textarea, input:not([type="range"]):not([type="checkbox"]):not([type="button"]), [contenteditable="true"]';

	/** @param {KeyboardEvent} event */
	function isSpace(event) {
		const typing = event.target instanceof Element && event.target.closest(TYPING);
		return event.code === 'Space' && !typing && !event.defaultPrevented;
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (!isSpace(event)) return;
		event.preventDefault();
		if (!event.repeat) togglePlay();
	}

	/** Stop a focused button from also taking the Space as a click. @param {KeyboardEvent} event */
	function onKeyup(event) {
		if (isSpace(event)) event.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

<div class="controls ui-card">
	<div class="row">
		<div class="cluster" role="group" aria-label="Where in the song">
			<button
				type="button"
				class="play ui-button ui-button-primary"
				disabled={player.loading}
				onclick={togglePlay}
				aria-label={player.playing ? 'Pause' : 'Play'}
				use:tooltip={TIPS.transcription.play}
			>
				<PlayPauseGlyph playing={player.playing} />
			</button>
			<div class="keys">
				<button
					type="button"
					class="ui-button"
					onclick={() => transcription.startOver()}
					aria-label="Start over"
					use:tooltip={TIPS.transcription.startOver}><TransportGlyph shape="start" /></button
				>
				<button
					type="button"
					class="ui-button"
					onclick={() => transcription.stepBar(-1)}
					aria-label="A bar back"
					use:tooltip={TIPS.transcription.barBack}><TransportGlyph shape="back" /></button
				>
				<button
					type="button"
					class="ui-button"
					onclick={() => transcription.stepBar(1)}
					aria-label="A bar forward"
					use:tooltip={TIPS.transcription.barForward}><TransportGlyph shape="forward" /></button
				>
			</div>
			<div class="readout ui-well">
				<PlayClock
					time={player.time}
					duration={player.duration}
					beat={transcription.quartersNow + (transcription.grid?.bars.firstBeat ?? 0)}
					bars={transcription.bars}
					class="text-xl"
				/>
			</div>
		</div>

		<div class="cluster listening">
			<SpeedControl {player} />
			<CountAlongButton {transcription} class="h-10 w-12" />
			<TunerButton class="h-10 w-12" onopen={() => player.pause()} />
		</div>
	</div>
</div>

<style>
	/* Two clusters, centred: where you are, and how it sounds. Every control is one
	   height and sits on one centre line. The card is a container, so the
	   layout follows the bar's own width. */
	.controls {
		position: sticky; /* stays in view while you scroll down to the piano roll */
		top: calc(var(--top-bar-height, 3.5rem) + 0.5rem);
		z-index: 20;
		container-type: inline-size;
		padding: 0.75rem 1rem;
		background-color: color-mix(
			in oklab,
			var(--color-raised) calc(100% - 30% * var(--glass)),
			transparent
		);
		backdrop-filter: blur(calc(14px * var(--glass))) saturate(calc(100% + 50% * var(--glass)));
		-webkit-backdrop-filter: blur(calc(14px * var(--glass)))
			saturate(calc(100% + 50% * var(--glass)));
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem 2rem;
	}

	.cluster {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.listening {
		gap: 1rem;
	}

	.play {
		width: 3.75rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		font-size: 1.4rem;
		line-height: 1;
	}

	/* Start over and the bar steps as one strip of keys */
	.keys {
		display: flex;
	}
	.keys .ui-button {
		width: 2.75rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		font-size: 1.25rem;
		line-height: 1;
		border-radius: 0;
	}
	.keys .ui-button + .ui-button {
		margin-left: -1px;
	}
	.keys .ui-button:first-child {
		border-radius: var(--corner-control) 0 0 var(--corner-control);
	}
	.keys .ui-button:last-child {
		border-radius: 0 var(--corner-control) var(--corner-control) 0;
	}

	.readout {
		height: 2.5rem;
		display: grid;
		place-items: center;
		padding: 0 0.4rem;
		border-radius: var(--corner-control);
	}

	/* Phones: each zone may wrap, its lines centred too */
	@container (max-width: 520px) {
		.cluster {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
