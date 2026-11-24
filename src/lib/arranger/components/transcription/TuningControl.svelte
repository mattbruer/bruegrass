<script>
	/**
	 * Fine tuning (in the recording's menu, which stays open while it plays,
	 * so it can be nudged by ear against the band): a cent at a time (tap the number to go
	 * back to as recorded), or Find how far it is from A = 440. Between two
	 * notes Find can go either way, so the other way is a button beside it.
	 * The caption under it is the A the band tuned to.
	 */
	import { MAX_CENTS, concertA } from '$lib/slowDowner/tuning.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const cents = $derived(transcription.player.cents);
	const shown = $derived(centsLabel(cents));
	const otherWay = $derived(transcription.tuningOtherWay);

	/** @param {number} value */
	function centsLabel(value) {
		return value === 0 ? '0¢' : `${value > 0 ? '+' : '−'}${Math.abs(value)}¢`;
	}
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
	{#if otherWay !== null}
		<button
			type="button"
			class="h-10 ui-button px-3 tabular-nums"
			onclick={() => transcription.tuneTheOtherWay()}
			use:tooltip={TIPS.transcription.tuneOtherWay}>or {centsLabel(otherWay)}</button
		>
	{/if}
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
