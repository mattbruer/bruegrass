<script>
	/**
	 * Transcribe's one row of controls: play, start over and a bar back or
	 * forward (or click the ruler for any spot), + Marker (name the section
	 * the playhead is in, at its bar), where you are, speed (the
	 * pitch stays), fine tuning (TuningControl), Count along (a click on every beat, higher on ONE), Move beat 1 (back to placing it), the
	 * song's key (the time signature is chosen with beat 1), zoom for
	 * the grid and the piano roll (across and down), and More:
	 * the whole song's beats counted twice or half as fast, finding them
	 * again, and how the slowed-down sound is made. It stays in view under the
	 * top bar, so Play is at hand while you write in the piano roll below.
	 * Only in the workspace: placing beat 1 has its own few controls.
	 */
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import TuningControl from './TuningControl.svelte';
	import TranscriptionKeySelect from './TranscriptionKeySelect.svelte';
	import PlayPauseGlyph from '../icons/PlayPauseGlyph.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import { SOUNDS, soundById } from '$lib/slowDowner/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import PlayClock from './PlayClock.svelte';

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

<div class="controls flex flex-wrap items-center gap-x-5 gap-y-3 ui-card px-4 py-3">
	<button
		type="button"
		class="play ui-button px-5 py-2 ui-button-primary"
		disabled={player.loading}
		onclick={togglePlay}
		aria-label={player.playing ? 'Pause' : 'Play'}
		use:tooltip={TIPS.transcription.play}
	>
		<PlayPauseGlyph playing={player.playing} />
	</button>
	<div class="flex items-center gap-1" role="group" aria-label="Where in the song">
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.startOver()}
			aria-label="Start over"
			use:tooltip={TIPS.transcription.startOver}>⏮︎</button
		>
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.stepBar(-1)}
			use:tooltip={TIPS.transcription.barBack}>‹ Bar</button
		>
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.stepBar(1)}
			use:tooltip={TIPS.transcription.barForward}>Bar ›</button
		>
		<button
			type="button"
			class="ml-1 ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.markHere()}
			use:tooltip={TIPS.transcription.addMarker}>+ Marker</button
		>
	</div>
	<PlayClock
		time={player.time}
		duration={player.duration}
		beat={transcription.quartersNow + (transcription.grid?.bars.firstBeat ?? 0)}
		bars={transcription.bars}
		class="text-sm text-ink-soft"
	/>

	<SpeedControl {player} />

	<TuningControl {transcription} />

	<span class="flex items-center gap-2">
		<ToggleSwitch
			bind:on={transcription.clicksOn}
			labelledBy="count-along"
			tip={TIPS.transcription.countAlong}
		/>
		<span id="count-along" class="text-sm">Count along</span>
	</span>

	<TranscriptionKeySelect {transcription} />

	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm"
		onclick={() => transcription.setDownbeatAgain()}
		use:tooltip={TIPS.transcription.moveDownbeat}>Move beat 1…</button
	>

	<ZoomControl zoom={settings.transcribe.zoom} />

	<details class="more relative ml-auto">
		<summary class="ui-button px-3 py-1.5 text-sm" use:tooltip={TIPS.transcription.more}
			>More</summary
		>
		<div class="menu ui-card">
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left text-sm"
				onclick={() => transcription.doubleBeats()}
				use:tooltip={TIPS.transcription.doubleBeats}>Count twice as fast</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left text-sm"
				onclick={() => transcription.halveBeats()}
				use:tooltip={TIPS.transcription.halveBeats}>Count half as fast</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-left text-sm"
				onclick={() => transcription.findBeatsAgain()}
				use:tooltip={TIPS.transcription.findAgain}>Find the beats again</button
			>
			<span class="mt-1 text-xs text-ink-soft">Slowed-down sound</span>
			<TabSwitch
				tabs={SOUNDS}
				bind:value={settings.transcribe.sound}
				tips={TIPS.transcribe.sounds}
				label="Sound"
			/>
		</div>
	</details>
</div>

<style>
	/* Stays in view while you scroll down to the piano roll */
	.controls {
		position: sticky;
		top: calc(var(--top-bar-height, 3.5rem) + 0.5rem);
		z-index: 20;
	}

	.play {
		font-size: 1.25rem;
		line-height: 1;
	}

	.more summary {
		list-style: none;
		cursor: pointer;
	}

	.more summary::-webkit-details-marker {
		display: none;
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.4rem);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: max-content;
		padding: 0.6rem;
	}
</style>
