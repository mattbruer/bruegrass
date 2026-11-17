<script>
	/**
	 * Setting up a transcription, one step at a time (setupSteps.js): choose
	 * a recording, beat 1 and the time signature, listen through. Where you are shows at the
	 * top, Back goes a step back, and the last step's own Done opens the
	 * workspace. Each step's own screen does the work.
	 */
	import { SETUP_STEPS } from '../../transcription/setupSteps.js';
	import RecordingChoice from './RecordingChoice.svelte';
	import AnalysingRecording from './AnalysingRecording.svelte';
	import DownbeatStep from './DownbeatStep.svelte';
	import ListenStep from './ListenStep.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const step = $derived(transcription.setupStep);
	const stepIndex = $derived(SETUP_STEPS.findIndex((each) => each.id === step));

	function back() {
		if (step === 'downbeat') transcription.chooseRecordingAgain();
		if (step === 'listen') transcription.setDownbeatAgain();
	}
</script>

<section class="flex flex-col gap-5 ui-card p-5" aria-labelledby="setup-step">
	<ol class="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Setting up">
		{#each SETUP_STEPS as each, index (each.id)}
			<li
				class={index === stepIndex ? 'font-bold text-accent' : 'text-ink-soft'}
				aria-current={index === stepIndex ? 'step' : undefined}
			>
				{index < stepIndex ? '✓' : `${index + 1}.`}
				{each.name}
			</li>
		{/each}
	</ol>

	<h2 id="setup-step" class="text-2xl font-bold">
		Step {stepIndex + 1} of {SETUP_STEPS.length}: {SETUP_STEPS[stepIndex]?.name}
	</h2>

	{#if step === 'recording'}
		<p class="text-lg">Which recording do you want to work out?</p>
		<RecordingChoice
			current={transcription.recording}
			onChoose={(recording) => transcription.open(recording)}
		/>
		{#if transcription.recording}
			<div>
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					onclick={() => transcription.keepRecording()}>Keep {transcription.recording.name}</button
				>
			</div>
		{/if}
	{:else if step === 'downbeat'}
		{#if transcription.player.loading}
			<p class="text-ink-soft">Loading the recording…</p>
		{:else if transcription.finding}
			<AnalysingRecording />
		{:else}
			<DownbeatStep {transcription} />
		{/if}
	{:else if step === 'listen'}
		<ListenStep {transcription} />
	{/if}

	<div class="flex flex-wrap items-center gap-3 border-t border-line pt-4">
		{#if stepIndex > 0}
			<button
				type="button"
				class="ui-button px-5 py-2"
				onclick={back}
				use:tooltip={TIPS.transcription.setupBack}>‹ Back</button
			>
		{/if}
	</div>
</section>
