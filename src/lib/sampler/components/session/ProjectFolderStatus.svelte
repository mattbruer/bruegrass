<!--
	Where the session's samples are on disk (samples-source/<folder>/), whether
	the last save worked, and a button to save everything again.
-->
<script>
	import { PROJECT_FOLDER_ROOT } from '../../session/projectFolder.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const copy = $derived(session.projectCopy);

	const status = $derived.by(() => {
		if (copy.progress) return `Saving ${copy.progress.done} of ${copy.progress.total}…`;
		if (copy.status === 'saving') return 'Saving…';
		if (copy.status === 'failed') return `Last save failed: ${copy.problem}`;
		if (copy.status === 'saved') return 'Saved.';
		return 'Each take is saved here when you keep it.';
	});
</script>

<div class="flex flex-wrap items-center gap-3 text-sm">
	<p class="min-w-0 flex-1">
		In the project:
		<code class="font-semibold">{PROJECT_FOLDER_ROOT}/{copy.folder}/</code>
		<span
			class:text-danger={copy.status === 'failed'}
			class:text-ink-soft={copy.status !== 'failed'}
			role="status">{status}</span
		>
	</p>
	<button
		type="button"
		class="ui-button px-3 py-1.5"
		disabled={session.keptCount === 0 || copy.status === 'saving'}
		onclick={() => copy.saveAll()}
		use:tooltip={TIPS.sampler.saveAllToProject}
	>
		Save all again
	</button>
</div>
