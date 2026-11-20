<script>
	/**
	 * Which recording to transcribe: one of the app's songs, or a file from this
	 * device (an MP3, WAV or anything the browser plays).
	 */
	import { BUNDLED_REFERENCES, bundledReference } from '../../transcription/bundledReferences.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   current: import('../../transcription/TranscriptionState.svelte.js').Reference | null,
	 *   onChoose: (reference: import('../../transcription/TranscriptionState.svelte.js').Reference) => void
	 * }}
	 */
	let { current, onChoose } = $props();

	/** @type {HTMLInputElement | undefined} */
	let fileInput = $state();

	/** @param {string} key */
	function chooseSong(key) {
		const reference = bundledReference(key);
		if (reference) onChoose(reference);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function chooseFile(event) {
		const file = event.currentTarget.files?.[0];
		if (file) onChoose({ key: `file:${file.name}:${file.size}`, name: file.name, source: file });
		event.currentTarget.value = '';
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<select
		class="min-w-0 flex-1 ui-field px-3 py-2"
		value={current?.key.startsWith('file:') ? '' : (current?.key ?? '')}
		onchange={(event) => chooseSong(event.currentTarget.value)}
		aria-label="Recording"
		use:tooltip={TIPS.transcription.song}
	>
		<option value="" disabled>
			{current?.key.startsWith('file:') ? current.name : 'Pick a song…'}
		</option>
		{#each BUNDLED_REFERENCES as reference (reference.key)}
			<option value={reference.key}>{reference.name}</option>
		{/each}
	</select>
	<button
		type="button"
		class="ui-button px-4 py-2"
		onclick={() => fileInput?.click()}
		use:tooltip={TIPS.transcription.file}
	>
		Open a recording…
	</button>
	<input bind:this={fileInput} type="file" accept="audio/*" class="hidden" onchange={chooseFile} />
</div>
