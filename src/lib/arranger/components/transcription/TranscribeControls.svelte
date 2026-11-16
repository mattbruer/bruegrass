<script>
	/**
	 * Transcribe's one row of controls: play, start over and a bar back or
	 * forward (or click the ruler for any spot), + Marker (name the section
	 * the playhead is in, at its bar), where you are, speed (the
	 * pitch stays), fine tuning (TuningControl), Count along (a click on every beat, higher on ONE), Move beat 1, Mark the parts (both back to that step of the setup), the
	 * song's key and time signature (both can be set at any time), zoom for
	 * the grid and the piano roll (across and down), and More:
	 * the whole song's beats counted twice or half as fast, finding them
	 * again, and how the slowed-down sound is made. While beat 1 is being
	 * placed there are no bars yet, so only what works without them shows:
	 * play, start over, speed, tuning, time, zoom and the sound.
	 */
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import ZoomControl from '$lib/components/zoom/ZoomControl.svelte';
	import TuningControl from './TuningControl.svelte';
	import { songKeyChoices } from '../../chart/keyChoices.js';
	import SongKeyOptions from '../chart/SongKeyOptions.svelte';
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';
	import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '$lib/slowDowner/speed.js';
	import { SOUNDS, soundById } from '$lib/slowDowner/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { formatClock } from '$lib/utils/formatClock.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	const NOT_NAMED = '';
	const beforeBeats = $derived(transcription.settingDownbeat);
	const keyChoices = $derived(songKeyChoices(transcription.arranger.arrangement.capoFret));

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

<div class="flex flex-wrap items-center gap-x-5 gap-y-3 ui-card px-4 py-3">
	<button
		type="button"
		class="ui-button px-5 py-2 ui-button-primary"
		disabled={player.loading}
		onclick={togglePlay}
		use:tooltip={TIPS.transcription.play}
	>
		{player.playing ? 'Pause' : 'Play'}
	</button>
	<div class="flex items-center gap-1" role="group" aria-label="Where in the song">
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.startOver()}
			aria-label="Start over"
			use:tooltip={TIPS.transcription.startOver}>⏮︎</button
		>
		{#if !beforeBeats}
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
		{/if}
	</div>
	<span class="text-sm text-ink-soft tabular-nums">
		{formatClock(player.time)} / {formatClock(player.duration)}
	</span>

	<label class="flex items-center gap-2">
		<span class="text-sm text-ink-soft">Speed</span>
		<input
			type="range"
			min={MIN_SPEED}
			max={MAX_SPEED}
			step={SPEED_STEP}
			value={player.speed}
			oninput={(event) => player.setSpeed(Number(event.currentTarget.value))}
			class="w-28"
			use:tooltip={TIPS.transcription.speed}
		/>
		<button
			type="button"
			class="w-14 ui-button px-2 py-1 text-sm tabular-nums"
			onclick={() => player.setSpeed(1)}
			use:tooltip={TIPS.transcription.resetSpeed}>{Math.round(player.speed * 100)}%</button
		>
	</label>

	<TuningControl {transcription} />

	{#if !beforeBeats}
		<span class="flex items-center gap-2">
			<ToggleSwitch
				bind:on={transcription.clicksOn}
				labelledBy="count-along"
				tip={TIPS.transcription.countAlong}
			/>
			<span id="count-along" class="text-sm">Count along</span>
		</span>

		<label class="flex items-center gap-2">
			<span class="text-sm text-ink-soft">Key</span>
			<select
				class="ui-field px-2 py-1.5"
				value={transcription.key ?? NOT_NAMED}
				onchange={(event) => transcription.setKey(event.currentTarget.value || null)}
				use:tooltip={TIPS.transcription.key}
			>
				<option value={NOT_NAMED}>Not known yet</option>
				<SongKeyOptions choices={keyChoices} />
			</select>
		</label>
	{/if}

	{#if !beforeBeats}
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.setDownbeatAgain()}
			use:tooltip={TIPS.transcription.moveDownbeat}>Move beat 1…</button
		>
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm"
			onclick={() => transcription.nameSections()}
			use:tooltip={TIPS.transcription.nameSections}>Mark the parts…</button
		>
	{/if}

	<div class="flex items-center gap-1" role="group" aria-label="Time signature">
		<span class="mr-1 text-sm text-ink-soft">Time</span>
		{#each TIME_SIGNATURES as time (time.id)}
			<button
				type="button"
				class="ui-button px-2.5 py-1.5 text-sm tabular-nums"
				class:ui-button-on={time.id === transcription.time}
				aria-pressed={time.id === transcription.time}
				onclick={() => transcription.setTime(time.id)}
				use:tooltip={`${time.count}: ${time.about}. ${TIPS.transcription.time}`}>{time.id}</button
			>
		{/each}
	</div>

	<ZoomControl zoom={settings.transcribe.zoom} />

	<details class="more relative ml-auto">
		<summary class="ui-button px-3 py-1.5 text-sm" use:tooltip={TIPS.transcription.more}
			>More</summary
		>
		<div class="menu ui-card">
			{#if !beforeBeats}
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
			{/if}
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
