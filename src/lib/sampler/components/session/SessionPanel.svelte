<!--
	An open recording session: what to record, the buttons, the take and its
	checks, progress, and export. Thin: the work is in RecordingSession.
	Owns the session's keys while it's open.
-->
<script>
	import { onMount } from 'svelte';
	import { listenForShortcuts } from '../../keyboardShortcuts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import TargetPrompt from './TargetPrompt.svelte';
	import SessionControls from './SessionControls.svelte';
	import SessionTake from './SessionTake.svelte';
	import ProgressGrid from './ProgressGrid.svelte';
	import ExportSamples from './ExportSamples.svelte';
	import RecordingListButton from './RecordingListButton.svelte';
	import ProjectFolderStatus from './ProjectFolderStatus.svelte';

	/**
	 * @type {{
	 *   session: import('../../session/RecordingSession.svelte.js').RecordingSession,
	 *   onclose: () => void
	 * }}
	 */
	let { session, onclose } = $props();

	onMount(() =>
		listenForShortcuts({
			record: () => session.toggleRecording(),
			play: () => session.togglePlaying(),
			keep: () => session.keep(),
			discard: () => session.discard(),
			previous: () => session.previous(),
			next: () => session.next()
		})
	);
</script>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<div class="min-w-0 flex-1">
		<h2 class="text-lg font-bold">{session.session.name}</h2>
		<p class="text-sm text-ink-soft">
			{session.keptCount} of {session.targets.length} kept · saved on this computer as you go
		</p>
	</div>
	<RecordingListButton checklist={session.checklist} {session} />
	<button
		type="button"
		class="ui-button px-3 py-1.5 text-sm"
		disabled={session.recording || session.busy}
		onclick={onclose}
		use:tooltip={TIPS.sampler.closeSession}
	>
		All sessions
	</button>
</div>

<div class="ui-well p-4">
	<TargetPrompt {session} />
</div>

<div class="mt-4">
	<SessionControls {session} />
</div>

<div class="mt-4">
	<SessionTake {session} />
</div>

<div class="mt-6">
	<ProgressGrid {session} />
</div>

<div class="mt-6 space-y-3">
	<ProjectFolderStatus {session} />
	<ExportSamples {session} />
</div>
