<!--
	Download the session's kept samples as one zip (WAVs plus a manifest),
	optionally with the uncut takes. Any time: a half-finished session
	exports what's kept so far, for ear tests.
-->
<script>
	import { exportSamples } from '../../session/exportSamples.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	let includeRaw = $state(false);
	/** @type {{ done: number, total: number } | null} */
	let progress = $state(null);
	let message = $state('');

	async function run() {
		message = '';
		progress = { done: 0, total: session.keptCount };
		try {
			const count = await exportSamples(session.session, {
				includeRaw,
				onProgress: (done, total) => (progress = { done, total })
			});
			message = `${count} ${count === 1 ? 'sample' : 'samples'} exported.`;
		} catch (error) {
			message = `Export failed: ${error instanceof Error ? error.message : error}`;
		} finally {
			progress = null;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={session.keptCount === 0 || progress !== null || session.recording}
		onclick={run}
		use:tooltip={TIPS.sampler.exportSamples}
	>
		{progress ? `Exporting ${progress.done} of ${progress.total}…` : 'Export samples'}
	</button>
	<label class="flex items-center gap-2 text-sm" use:tooltip={TIPS.sampler.includeRaw}>
		<input type="checkbox" bind:checked={includeRaw} />
		With the uncut takes
	</label>
	{#if message}<p class="text-sm text-ink-soft" role="status">{message}</p>{/if}
</div>
