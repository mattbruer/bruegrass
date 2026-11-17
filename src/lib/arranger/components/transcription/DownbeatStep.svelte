<script>
	/**
	 * Setup's second step: find beat 1. Play, and tap the big button on the
	 * first beat of the first full bar; the tap is moved back onto the hit it
	 * meant, and the beats are found through it at once. Then listen: a
	 * click on every beat, higher on ONE. Sounds right goes on; Try again
	 * taps again. Slowing it down helps catch it (and the listening plays at
	 * the same speed).
	 */
	import SpeedControl from './SpeedControl.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

<div class="flex flex-col gap-5">
	{#if transcription.checkingDownbeat}
		<p class="text-lg">
			The bars and beats are found. Listen: the high click should land on the first beat of every
			bar, where you’d count “one”.
		</p>
		<div class="flex flex-wrap gap-3">
			<button
				type="button"
				class="big ui-button"
				onclick={() => (player.playing ? player.pause() : transcription.listenToDownbeat())}
				use:tooltip={TIPS.transcription.listenDownbeat}
			>
				{player.playing ? '❚❚ Pause' : '▶ Listen'}
			</button>
		</div>
		<div class="flex flex-wrap gap-3">
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.downbeatSoundsRight()}>Sounds right</button
			>
			<button type="button" class="big ui-button" onclick={() => transcription.tapDownbeatAgain()}
				>Try again</button
			>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<p class="text-lg">
				Play the song. Tap the button on the very first beat of the first full bar, where you’d
				count “one”.
			</p>
			<p class="text-ink-soft">
				From that one beat, the bars and beats of the whole song are found for you.
			</p>
			<p class="text-ink-soft">
				If a few notes come before the first full bar (a pickup), skip them and tap the “one” after
				them. A pickup can be added later.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="big ui-button"
				onclick={() => (player.playing ? player.pause() : player.play())}
			>
				{player.playing ? '❚❚ Pause' : '▶ Play'}
			</button>
			<button
				type="button"
				class="ui-button px-4 py-2"
				onclick={() => player.seek(0)}
				use:tooltip={TIPS.transcription.fromTheStart}>⏮ From the start</button
			>
			<span class="text-lg text-ink-soft tabular-nums">{clock(player.time)}</span>
			<SpeedControl {player} />
		</div>
		<div>
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.tapDownbeat()}>That’s “one”</button
			>
		</div>
		{#if transcription.grid && transcription.sections.length > 0}
			<div>
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => transcription.cancelSettingDownbeat()}
					use:tooltip={TIPS.transcription.keepBeats}>Keep the beats I have</button
				>
			</div>
		{/if}
	{/if}
</div>

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
