<script>
	/**
	 * Setup's step before beat 1: how the song is counted, so its bars can
	 * be found (TIME_SIGNATURES). The usual count for the whole song; a bar
	 * with more or fewer beats is fixed later, in its own menu.
	 */
	import { TIME_SIGNATURES } from '../../transcription/timeSignatures.js';

	/** Most songs first, the less common after. */
	const ORDER = ['4/4', '3/4', '2/4', '2/2'];

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const choices = ORDER.flatMap((id) => TIME_SIGNATURES.filter((time) => time.id === id));
</script>

<div class="flex flex-col gap-4">
	<p class="text-xl">How do you count along with the song?</p>
	<div class="grid gap-3 sm:grid-cols-2">
		{#each choices as time (time.id)}
			<button
				type="button"
				class="choice ui-button"
				class:ui-button-on={transcription.time === time.id}
				onclick={() => transcription.chooseTime(time.id)}
			>
				<span class="block text-2xl font-bold">{time.count}</span>
				<span class="block text-ink-soft">{time.about} ({time.id})</span>
			</button>
		{/each}
	</div>
	<p class="text-ink-soft">Not sure? Pick the first one.</p>
	<p class="text-ink-soft">
		If a bar here and there has more or fewer beats, that’s fine: you can fix those bars later.
	</p>
</div>

<style>
	.choice {
		padding: 1rem 1.25rem;
		text-align: left;
	}
</style>
