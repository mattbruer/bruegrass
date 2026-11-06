<!--
	The session's buttons, each with its key so the guitar can stay in your
	hands: Record (R), Listen (Space), Keep (K), Throw away (X).
	The keys themselves are wired up in SessionPanel.
-->
<script>
	import { SHORTCUTS } from '../../keyboardShortcuts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import KeyHint from '../KeyHint.svelte';
	import RecordButton from '../RecordButton.svelte';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const inputOn = $derived(session.input.status === 'on' || session.recording);
	const fresh = $derived(session.takesFor(session.target.id).fresh);
	const idle = $derived(!session.recording && !session.busy);
</script>

<div class="flex flex-wrap items-center justify-center gap-3">
	<RecordButton
		recording={session.recording}
		disabled={!inputOn || session.busy}
		tip={TIPS.sampler.recordTarget}
		onclick={() => session.toggleRecording()}
	/>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!session.shown || !idle || !inputOn}
		onclick={() => session.togglePlaying()}
		use:tooltip={TIPS.sampler.playSample}
	>
		{session.playing ? 'Stop' : 'Listen'}
		<KeyHint label={SHORTCUTS.play.label} />
	</button>

	<button
		type="button"
		class="ui-button px-4 py-2 ui-button-primary"
		disabled={!fresh || !idle}
		onclick={() => session.keep()}
		use:tooltip={TIPS.sampler.keep}
	>
		Keep
		<KeyHint label={SHORTCUTS.keep.label} />
	</button>

	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!fresh || !idle}
		onclick={() => session.discard()}
		use:tooltip={TIPS.sampler.discard}
	>
		Throw away
		<KeyHint label={SHORTCUTS.discard.label} />
	</button>
</div>

{#if !inputOn}
	<p class="mt-2 text-center text-sm text-ink-soft">Turn the input on (above) to record.</p>
{/if}
{#if session.problem}
	<p class="mt-2 text-center text-sm text-danger" role="alert">{session.problem}</p>
{/if}
