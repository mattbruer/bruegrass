<script>
	/**
	 * What comes before the workspace: pick a recording, and wait while its
	 * beats are found. Everything else (the time, where bar 1 is, the key,
	 * the song's name) is set in the workspace.
	 */
	import ReferenceChoice from './ReferenceChoice.svelte';
	import AnalysingReference from './AnalysingReference.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState }} */
	let { transcription } = $props();

	const step = $derived(transcription.setupStep);
</script>

<section class="flex flex-col gap-5 ui-card p-5" aria-labelledby="setup-title">
	{#if step === 'reference'}
		<h2 id="setup-title" class="text-2xl font-bold">Which recording do you want to work out?</h2>
		<ReferenceChoice
			current={transcription.reference}
			onChoose={(reference) => transcription.open(reference)}
		/>
		{#if transcription.reference}
			<div>
				<button
					type="button"
					class="ui-button px-5 py-2 ui-button-primary"
					onclick={() => transcription.keepReference()}>Keep {transcription.reference.name}</button
				>
			</div>
		{/if}
	{:else}
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 id="setup-title" class="text-2xl font-bold">{transcription.reference?.name}</h2>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={() => transcription.chooseReferenceAgain()}
				use:tooltip={TIPS.transcription.changeReference}>Another recording…</button
			>
		</div>
		{#if transcription.player.loading}
			<p class="text-ink-soft">Loading the recording…</p>
		{:else}
			<AnalysingReference />
		{/if}
	{/if}
</section>
