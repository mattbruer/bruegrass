<script>
	/**
	 * Transcribe's one row of controls: play, where you are, speed (the
	 * pitch stays), Count along (a click on every beat, higher on ONE), the
	 * song's key and time signature (both can be set at any time), and More:
	 * the whole song's beats counted twice or half as fast, finding them
	 * again, and how the slowed-down sound is made.
	 */
	import ToggleSwitch from '$lib/settings/controls/ToggleSwitch.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { songKeyChoices } from '../../chart/keyChoices.js';
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';
	import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '$lib/transcribe/speed.js';
	import { SOUNDS, soundById } from '$lib/transcribe/sounds.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	const NOT_NAMED = '';
	const keyChoices = $derived(songKeyChoices(transcription.arranger.arrangement.capoFret));

	$effect(() => {
		transcription.player.setFrameSeconds(soundById(settings.transcribe.sound).frameSeconds);
	});

	function togglePlay() {
		if (player.playing) player.pause();
		else player.play();
	}

	/** @param {KeyboardEvent} event Space plays and pauses, unless typing or on a button */
	function onKeydown(event) {
		const target = event.target;
		const busy = target instanceof Element && target.closest('input, textarea, select, button');
		if (event.code !== 'Space' || busy || event.defaultPrevented) return;
		event.preventDefault();
		togglePlay();
	}

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.floor(seconds || 0);
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

<svelte:window onkeydown={onKeydown} />

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
	<span class="text-sm text-ink-soft tabular-nums">
		{clock(player.time)} / {clock(player.duration)}
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
			{#each keyChoices as choice (choice.value)}
				<option value={choice.value}>{choice.name}</option>
			{/each}
		</select>
	</label>

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
