<script>
	/**
	 * What comes before the workspace: pick a recording, then place its beat 1
	 * and time signature (the bars are found from them). Anything else about
	 * the bars and beats is fixed in the workspace.
	 */
	import RecordingChoice from './RecordingChoice.svelte';
	import AnalysingRecording from './AnalysingRecording.svelte';
	import DownbeatStep from './DownbeatStep.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const step = $derived(transcription.setupStep);
</script>

<section class="flex flex-col gap-5 ui-card p-5" aria-labelledby="setup-title">
	{#if step === 'recording'}
		<h2 id="setup-title" class="text-2xl font-bold">Which recording do you want to work out?</h2>
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
	{:else}
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 id="setup-title" class="text-2xl font-bold">Beat 1 and time</h2>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => transcription.chooseRecordingAgain()}
				use:tooltip={TIPS.transcription.changeRecording}>Another recording…</button
			>
		</div>
		{#if transcription.player.loading}
			<p class="text-ink-soft">Loading the recording…</p>
		{:else if transcription.finding}
			<AnalysingRecording />
		{:else}
			<DownbeatStep {transcription} />
		{/if}
	{/if}
</section>
