<script>
	/**
	 * Guess the chords, or clear them: with no chords yet it fills every bar
	 * with a guess from the recording, to fix by ear; once there are chords
	 * it empties them all. Never runs on its own (the user's call: working
	 * chords out by ear is still the practice).
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

{#if transcription.hasChords}
	<button
		type="button"
		class="ui-button px-1.5 text-xs"
		onclick={() => transcription.clearChords()}
		use:tooltip={TIPS.transcription.clearChords}>Clear chords</button
	>
{:else}
	<button
		type="button"
		class="ui-button px-1.5 text-xs"
		disabled={!transcription.audio}
		onclick={() => transcription.guessChords()}
		use:tooltip={TIPS.transcription.guessChords}>Guess</button
	>
{/if}
