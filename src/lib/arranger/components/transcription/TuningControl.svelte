<script>
	/**
	 * Fine tuning, in the control bar so it can be nudged by ear while the
	 * recording and the band play: a cent at a time (tap the number to go
	 * back to as recorded), or Find how far it is from A = 440. The caption
	 * under it is the A the band tuned to.
	 */
	import { MAX_CENTS, concertA } from '$lib/slowDowner/tuning.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const cents = $derived(transcription.player.cents);
	const shown = $derived(cents === 0 ? '0¢' : `${cents > 0 ? '+' : '−'}${Math.abs(cents)}¢`);
</script>

<div class="flex items-start gap-2" role="group" aria-label="Tuning">
	<span class="flex flex-col items-center gap-1">
		<span class="ui-key-strip h-10">
			<button
				type="button"
				class="w-9 ui-button"
				disabled={cents <= -MAX_CENTS}
				onclick={() => transcription.setTuning(cents - 1)}
				aria-label="A cent lower"
				use:tooltip={TIPS.transcription.tuneDown}>−</button
			>
			<button
				type="button"
				class="w-14 ui-button tabular-nums"
				onclick={() => transcription.setTuning(0)}
				use:tooltip={TIPS.transcription.tuneReset}>{shown}</button
			>
			<button
				type="button"
				class="w-9 ui-button"
				disabled={cents >= MAX_CENTS}
				onclick={() => transcription.setTuning(cents + 1)}
				aria-label="A cent higher"
				use:tooltip={TIPS.transcription.tuneUp}>+</button
			>
		</span>
		<span class="caption tabular-nums">Band’s A {concertA(-cents)}</span>
	</span>
	<button
		type="button"
		class="h-10 ui-button px-3"
		onclick={() => transcription.findTuning()}
		use:tooltip={TIPS.transcription.findTuning}>Find</button
	>
</div>

<style>
	.caption {
		font-size: 0.6rem;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
