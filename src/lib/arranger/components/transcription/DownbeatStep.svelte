<script>
	/**
	 * Setup's second step: find beat 1. The recording on a lane with its
	 * playhead: play it (slowed down if you like), click the lane to move the
	 * playhead, and press Beat 1 is here: paused, exactly on the playhead;
	 * playing, as a tap (moved back onto the hit just
	 * before it). The beats are found through it at once. Then listen: a
	 * click on every beat, higher on ONE. Sounds right goes on; Try again
	 * goes back to marking it.
	 */
	import RecordingStrip from './RecordingStrip.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	const checking = $derived(transcription.checkingDownbeat);

	function playOrPause() {
		if (player.playing) player.pause();
		else if (checking) transcription.listenToDownbeat();
		else player.play();
	}

	/** @param {number} seconds */
	function clock(seconds) {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
	}
</script>

<div class="flex flex-col gap-4">
	{#if checking}
		<p class="text-lg">
			The bars and beats are found. Listen: the high click should land on the first beat of every
			bar, where you’d count “one”.
		</p>
	{:else}
		<div class="flex flex-col gap-2">
			<p class="text-lg">
				Find the very first beat of the first full bar, where you’d count “one”, and press Beat 1 is
				here: with the playhead on it, or as a tap while it plays.
			</p>
			<p class="text-ink-soft">
				From that one beat, the bars and beats of the whole song are found for you, so the closer it
				is, the better everything lines up.
			</p>
			<p class="text-ink-soft">
				For a more exact beat 1: slow it down with Speed, so the beat is easier to catch, and zoom
				in (Zoom +) as far as you like, so the hits spread out and you can put the playhead right on
				one.
			</p>
			<p class="text-ink-soft">
				If a few notes come before the first full bar (a pickup), skip them and mark the “one” after
				them. A pickup can be added later.
			</p>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="big ui-button"
			onclick={playOrPause}
			use:tooltip={checking ? TIPS.transcription.listenDownbeat : TIPS.transcription.play}
		>
			{player.playing ? '❚❚ Pause' : checking ? '▶ Listen' : '▶ Play'}
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

	<RecordingStrip {transcription} />

	<div class="flex flex-wrap gap-3">
		{#if checking}
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.downbeatSoundsRight()}>Sounds right</button
			>
			<button type="button" class="big ui-button" onclick={() => transcription.tryDownbeatAgain()}
				>Try again</button
			>
		{:else}
			<button
				type="button"
				class="big ui-button ui-button-primary"
				onclick={() => transcription.markDownbeatHere()}
				use:tooltip={TIPS.transcription.markDownbeat}>Beat 1 is here</button
			>
			{#if transcription.grid && transcription.sections.length > 0}
				<button
					type="button"
					class="ui-button px-4 py-2"
					onclick={() => transcription.cancelSettingDownbeat()}
					use:tooltip={TIPS.transcription.keepBeats}>Keep the beats I have</button
				>
			{/if}
		{/if}
	</div>
</div>

<style>
	.big {
		min-height: 3.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.15rem;
		font-weight: 600;
	}
</style>
