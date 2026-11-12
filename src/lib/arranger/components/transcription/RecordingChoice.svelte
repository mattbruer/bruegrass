<script>
	/**
	 * Which recording to transcribe: one of the app's songs, or a file from this
	 * device (an MP3, WAV or anything the browser plays).
	 */
	import { songs } from '$lib/songs/songs.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   current: import('../../transcription/TranscriptionState.svelte.js').Recording | null,
	 *   onChoose: (recording: import('../../transcription/TranscriptionState.svelte.js').Recording) => void
	 * }}
	 */
	let { current, onChoose } = $props();

	const tracks = songs.toSorted((a, b) => a.title.localeCompare(b.title));

	/** @type {HTMLInputElement | undefined} */
	let fileInput = $state();

	/** @param {string} src */
	function chooseSong(src) {
		const song = tracks.find((track) => track.src === src);
		if (song) onChoose({ key: song.src, name: song.title.trim(), source: song.src });
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
		{#each tracks as track (track.src)}
			<option value={track.src}>{track.title.trim()}</option>
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
