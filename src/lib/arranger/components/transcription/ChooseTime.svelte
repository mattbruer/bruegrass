<script>
	/**
	 * The first thing to say about a new recording: how it's counted. Its
	 * beats are already found; this lays the bars out on them (and makes the
	 * song). Then the recording is slid onto the bars.
	 */
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<section class="flex flex-col gap-3 ui-card p-4" aria-labelledby="choose-time">
	<h2 id="choose-time" class="text-lg font-bold">How is it counted?</h2>
	<p class="text-ink-soft">
		The beats are found. Choose the time signature to lay the bars out, then drag the recording by
		its top strip until a “one” sits on a bar line. With a pickup, put the first “one” on bar 2.
	</p>
	<div class="flex flex-wrap gap-2" role="group" aria-label="Time signature">
		{#each TIME_SIGNATURES as time (time.id)}
			<button
				type="button"
				class="flex min-w-32 flex-col items-start ui-button px-4 py-2 text-left"
				onclick={() => transcription.chooseTime(time.id)}
				use:tooltip={TIPS.transcription.time}
			>
				<strong class="text-lg">{time.id}</strong>
				<span class="text-xs text-ink-soft">“{time.count}”: {time.about}</span>
			</button>
		{/each}
	</div>
</section>
