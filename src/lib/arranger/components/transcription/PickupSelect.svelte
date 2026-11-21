<script>
	/**
	 * The tune's pickup, chosen with beat 1: notes before it get that many
	 * beats of room before bar 1, in every voice, and the recording then
	 * starts a bar before beat 1 instead of on it.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();
</script>

<label class="flex items-center gap-2">
	<span class="mr-1">Pickup</span>
	<select
		class="ui-field px-3 py-2 text-lg font-semibold"
		value={transcription.pickup}
		onchange={(event) => {
			transcription.setPickup(Number(event.currentTarget.value));
			// A refused change leaves the pickup as it was: show that
			event.currentTarget.value = String(transcription.pickup);
		}}
		use:tooltip={TIPS.transcription.pickup}
	>
		{#each transcription.pickupChoices as beats (beats)}
			<option value={beats}
				>{beats === 0 ? 'None' : `${beats} ${beats === 1 ? 'beat' : 'beats'}`}</option
			>
		{/each}
	</select>
</label>
{#if transcription.pickupProblem}
	<p class="text-sm text-ink-soft" role="status">{transcription.pickupProblem}</p>
{/if}
