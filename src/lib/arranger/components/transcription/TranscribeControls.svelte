<script>
	/**
	 * Transcribe's control bar, centred: where you are (play, start over, a
	 * bar back or forward, the clock) and how it sounds (speed with the pitch
	 * kept, Count along as the metronome: a click on every beat, higher
	 * on ONE, the recording's fine tuning, and the tuner) the song as text (the pencil: the chart and the tune's ABC, in the
	 * editor drawer) and how much of the grid you see (Zoom, across and
	 * down; the piano roll has its own in its toolbar). + Marker is beside the grid's ruler, and the
	 * recording's own settings in its lane's menu (ReferenceMenu). It stays
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
	import { isTyping } from '$lib/utils/isTyping.js';
	import PlayClock from './PlayClock.svelte';
	import { shownBarNumber } from '../../transcription/barNumbers.js';
	import TunerButton from '$lib/tuner/TunerButton.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import DrawerKey from '../page/DrawerKey.svelte';
	import PencilIcon from '../icons/PencilIcon.svelte';

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
			transcription.play();
		}
	}

	/** Space plays and pauses wherever focus is, except while typing in a text box. */

	/** @param {KeyboardEvent} event */
	function isSpace(event) {
		return event.code === 'Space' && !isTyping(event) && !event.defaultPrevented;
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
			<div class="keys ui-key-strip">
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
					shownBar={(number) => shownBarNumber(number, transcription.pickupBar)}
					class="text-xl"
				/>
			</div>
		</div>

		<div class="cluster listening">
			<SpeedControl {player} />
			<CountAlongButton {transcription} class="h-10 w-12" />
			<TunerButton class="h-10 w-12" />
		</div>

		<div class="cluster">
			{#if transcription.linked}
				<DrawerKey id="edit" label="Edit" tip={TIPS.transcription.edit}>
					{#snippet icon()}<PencilIcon />{/snippet}
				</DrawerKey>
			{/if}
			<ZoomControl
				zoom={settings.transcribe.zoom}
				lowest={{ across: transcription.wholeSongZoom }}
			/>
		</div>
	</div>
</div>

<style>
	/* Three clusters, centred: where you are, how it sounds, and zoom. Every control is one
	   height and sits on one centre line. The card is a container, so the
	   layout follows the bar's own width. */
	.controls {
		position: sticky; /* stays in view while you scroll down to the piano roll */
		top: calc(var(--top-bar-height, 3.5rem) + 0.5rem);
		z-index: 20;
		container-type: inline-size;
		padding: 0.75rem 1rem;
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

	.keys {
		height: 2.5rem;
	}
	.keys .ui-button {
		width: 2.75rem;
		display: grid;
		place-items: center;
		font-size: 1.25rem;
		line-height: 1;
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
