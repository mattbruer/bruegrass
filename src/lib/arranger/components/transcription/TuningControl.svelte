<script>
	/**
	 * Fine tuning: nudge the recording's pitch a cent at a time (tap the
	 * number to go back to as recorded), or Find how far it is from A = 440.
	 * Shows the A the band tuned to. Set once per recording, if at all, so it
	 * lives in More for now.
	 */
	import { MAX_CENTS, concertA } from '$lib/slowDowner/tuning.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const cents = $derived(transcription.player.cents);
	const shown = $derived(cents === 0 ? '0¢' : `${cents > 0 ? '+' : '−'}${Math.abs(cents)}¢`);
</script>

<div class="flex flex-col gap-1" role="group" aria-label="Tuning">
	<div class="flex items-center gap-1">
		<button
			type="button"
			class="size-8 ui-button"
			disabled={cents <= -MAX_CENTS}
			onclick={() => transcription.setTuning(cents - 1)}
			aria-label="A cent lower"
			use:tooltip={TIPS.transcription.tuneDown}>−</button
		>
		<button
			type="button"
			class="h-8 w-12 ui-button text-sm tabular-nums"
			onclick={() => transcription.setTuning(0)}
			use:tooltip={TIPS.transcription.tuneReset}>{shown}</button
		>
		<button
			type="button"
			class="size-8 ui-button"
			disabled={cents >= MAX_CENTS}
			onclick={() => transcription.setTuning(cents + 1)}
			aria-label="A cent higher"
			use:tooltip={TIPS.transcription.tuneUp}>+</button
		>
		<button
			type="button"
			class="ml-1 h-8 ui-button px-3 text-sm"
			onclick={() => transcription.findTuning()}
			use:tooltip={TIPS.transcription.findTuning}>Find</button
		>
	</div>
	<span class="text-xs text-ink-soft tabular-nums">The band’s A = {concertA(-cents)}</span>
</div>
