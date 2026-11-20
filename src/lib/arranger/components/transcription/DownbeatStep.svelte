<script>
	/**
	 * Before the workspace: the time signature and beat 1, both needed before
	 * the bars can be found (the time is chosen here, with a ? that explains
	 * the counts; a crooked bar is fixed later in its own menu), and the
	 * recording's key, which is chosen only here (Move beat 1… comes back). The recording on a lane with its
	 * playhead: play it (slowed down if you like), click the lane to move the
	 * playhead, and press Beat 1 is here: paused, exactly on the playhead;
	 * playing, as a tap (moved back onto the hit just
	 * before it). The beats are found through it at once. Then listen: a
	 * click on every beat, higher on ONE. Sounds right goes on; Try again
	 * goes back to marking it.
	 */
	import ReferenceStrip from './ReferenceStrip.svelte';
	import PlayClock from './PlayClock.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import TranscriptionKeySelect from './TranscriptionKeySelect.svelte';
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const player = $derived(transcription.player);
	const checking = $derived(transcription.checkingDownbeat);
	let explaining = $state(false);
	let askedForTime = $state(false);

	function markBeat1() {
		askedForTime = !transcription.timeChosen;
		transcription.markDownbeatHere();
	}

	function playOrPause() {
		if (player.playing) player.pause();
		else if (checking) transcription.listenToDownbeat();
		else player.play();
	}
</script>

<div class="flex flex-col gap-4">
	{#if checking}
		<p class="text-lg">
			The bars and beats are found. Listen: the high click should land on the first beat of every
			bar, where you’d count “one”. If the bars are the wrong length, change the time signature.
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
				in (Zoom +) as far as you like, so the waveform spreads out and you can put the playhead
				right on one.
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
		<PlayClock time={player.time} duration={player.duration} class="text-lg text-ink-soft" />
		<SpeedControl {player} />
	</div>

	<ReferenceStrip {transcription} />

	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Time signature">
		<span class="mr-1">Time signature</span>
		{#each TIME_SIGNATURES as time (time.id)}
			<button
				type="button"
				class="w-16 ui-button px-3 py-2 text-lg font-semibold"
				class:ui-button-on={transcription.timeChosen && transcription.time === time.id}
				aria-pressed={transcription.timeChosen && transcription.time === time.id}
				onclick={() => {
					askedForTime = false;
					transcription.chooseTime(time.id);
				}}>{time.id}</button
			>
		{/each}
		<button
			type="button"
			class="size-9 ui-button rounded-full"
			class:ui-button-on={explaining}
			aria-expanded={explaining}
			aria-label="What do these mean?"
			onclick={() => (explaining = !explaining)}
			use:tooltip={TIPS.transcription.timeHelp}>?</button
		>
	</div>
	{#if explaining}
		<ul class="ui-well px-4 py-3 text-sm">
			{#each TIME_SIGNATURES as time (time.id)}
				<li class="py-0.5">
					<strong class="inline-block w-10">{time.id}</strong> count “{time.count}”: {time.about}
				</li>
			{/each}
			<li class="pt-2 text-ink-soft">
				A bar here and there with more or fewer beats can be fixed later.
			</li>
		</ul>
	{/if}
	{#if askedForTime && !transcription.timeChosen}
		<p class="text-danger" role="alert">Choose the time signature first.</p>
	{/if}

	<TranscriptionKeySelect {transcription} large />

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
				onclick={markBeat1}
				use:tooltip={TIPS.transcription.markDownbeat}>Beat 1 is here</button
			>
			{#if transcription.grid && transcription.movingDownbeat}
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
