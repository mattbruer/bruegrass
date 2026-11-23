<script>
	/**
	 * The Tracks page's control bar, like Transcribe's: where you are (Play,
	 * back to the start, the clock), Record (on the armed audio lane, after
	 * the count-in), how it sounds (the click, the tempo, the mixer), Undo and Zoom, and the
	 * picked clip's tools under them. It stays
	 * in view under the top bar (`height`: how tall it is, for what scrolls
	 * under it). Space plays and stops.
	 */
	/** @type {{ height?: number }} */
	let { height = $bindable(0) } = $props();

	import { useArranger } from '../../state/context.js';
	import { rulerBars } from '../../tracks/ruler.js';
	import { COUNT_IN_BARS } from '../../playback/metronome/countIn.js';
	import { onEveryFrame } from '../../../audio/analysis/frameLoop.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { isTyping } from '$lib/utils/isTyping.js';
	import PlayPauseGlyph from '../icons/PlayPauseGlyph.svelte';
	import TransportGlyph from '../icons/TransportGlyph.svelte';
	import RecordIcon from '../icons/RecordIcon.svelte';
	import MetronomeIcon from '../icons/MetronomeIcon.svelte';
	import PlayClock from '../transcription/PlayClock.svelte';
	import TempoStepper from '../player/TempoStepper.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import UndoButtons from './UndoButtons.svelte';
	import MixerButton from '../mixer/MixerButton.svelte';
	import ClipTools from './ClipTools.svelte';

	const { arrangement, player, recording } = useArranger();
	const { metronome } = player;

	/** The song's bars, as the clock counts them. */
	const bars = $derived(
		rulerBars(arrangement.sections)
			.filter((bar) => bar.number > 0)
			.map((bar) => ({ number: bar.number, firstBeat: bar.start, beats: bar.beats }))
	);
	const lastBar = $derived(bars.at(-1));
	const songEnd = $derived(lastBar ? lastBar.firstBeat + lastBar.beats : 0);

	/** Where the band is (quarters from bar 1): where the next Play starts while stopped. */
	let quartersNow = $state(0);
	$effect(() => {
		if (!player.isPlaying) {
			quartersNow = player.resumeAt;
			return;
		}
		return onEveryFrame(() => {
			const now = player.melodyTimeNow();
			if (Number.isFinite(now)) quartersNow = now;
		});
	});

	function playOrStop() {
		if (recording.isRecording) recording.stop();
		else if (player.isPlaying) player.stop();
		else player.play();
	}

	function recordOrStop() {
		if (recording.status === 'recording') recording.stop();
		else recording.record();
	}

	/** Space plays and stops wherever focus is, except while typing in a text box. */

	/** @param {KeyboardEvent} event */
	function isSpace(event) {
		return event.code === 'Space' && !isTyping(event) && !event.defaultPrevented;
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (!isSpace(event)) return;
		event.preventDefault();
		if (!event.repeat) playOrStop();
	}

	/** Stop a focused button from also taking the Space as a click. @param {KeyboardEvent} event */
	function onKeyup(event) {
		if (isSpace(event)) event.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

<div class="controls ui-card" bind:offsetHeight={height}>
	<div class="row">
		<div class="cluster" role="group" aria-label="Where in the song">
			<button
				type="button"
				class="play ui-button ui-button-primary"
				onclick={playOrStop}
				aria-label={player.isPlaying ? 'Stop' : 'Play'}
				use:tooltip={TIPS.tracks.play}
			>
				<PlayPauseGlyph playing={player.isPlaying} />
			</button>
			<div class="keys ui-key-strip">
				<button
					type="button"
					class="ui-button"
					onclick={() => player.toStart()}
					aria-label="Back to the start"
					use:tooltip={TIPS.player.toStart}><TransportGlyph shape="start" /></button
				>
			</div>
			<div class="readout ui-well">
				<PlayClock
					time={arrangement.clock.secondsAt(quartersNow)}
					duration={arrangement.clock.secondsAt(songEnd)}
					beat={quartersNow}
					{bars}
					class="text-xl"
				/>
			</div>
		</div>

		<div class="cluster" role="group" aria-label="Recording">
			<button
				type="button"
				class="record ui-button"
				class:ui-button-on={recording.isRecording}
				disabled={!recording.armedTrack ||
					recording.status === 'starting' ||
					recording.status === 'saving'}
				onclick={recordOrStop}
				aria-label={recording.status === 'recording' ? 'Stop recording' : 'Record'}
				use:tooltip={TIPS.tracks.record}
			>
				<RecordIcon recording={recording.isRecording} />
			</button>
			<label class="count-in" use:tooltip={TIPS.recording.countIn}>
				<span>Count-in</span>
				<select
					class="ui-field px-2 py-1.5"
					bind:value={settings.metronome.countInBars}
					disabled={recording.isRecording}
				>
					{#each COUNT_IN_BARS as count (count)}
						<option value={count}>{count === 1 ? '1 bar' : `${count} bars`}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="cluster" role="group" aria-label="Tempo and click">
			<button
				type="button"
				class="click ui-button"
				class:ui-button-on={metronome.on}
				aria-pressed={metronome.on}
				onclick={() => metronome.toggle()}
				use:tooltip={TIPS.player.metronome}
			>
				<MetronomeIcon tempo={arrangement.bpm} />
				<span class="sr-only">Click with the band</span>
			</button>
			<TempoStepper />
			<MixerButton />
		</div>

		<div class="cluster">
			<UndoButtons />
			<ZoomControl zoom={settings.tracks.zoom} />
		</div>
	</div>
	<ClipTools />
</div>

<style>
	/* Clusters centred, every control on one centre line, like Transcribe's bar. The card is a
	   container, so the layout follows the bar's own width. */
	.controls {
		position: sticky;
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

	.record,
	.click {
		width: 3.25rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		padding: 0.2rem;
	}

	.record :global(svg),
	.click :global(svg) {
		height: 100%;
		width: auto;
	}

	.count-in {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}

	/* Phones: each cluster may wrap, its lines centred too */
	@container (max-width: 520px) {
		.row {
			column-gap: 1rem;
		}
		.cluster {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
