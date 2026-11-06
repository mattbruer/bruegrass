<!--
	What to record now, big enough to read from where you sit with the
	guitar: "D string, fret 5", the intensity and take, the note it should
	sound, and how to play it. ← and → step through the targets.
-->
<script>
	import { describeTarget } from '../../session/describeTarget.js';
	import { SHORTCUTS } from '../../keyboardShortcuts.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import KeyHint from '../KeyHint.svelte';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const words = $derived(describeTarget(session.target, session.checklist));
	const takes = $derived(session.takesFor(session.target.id));
	const stepping = $derived(session.recording || session.busy);
</script>

<div class="flex items-start gap-3">
	<button
		type="button"
		class="ui-button px-3 py-2"
		disabled={stepping || session.index === 0}
		onclick={() => session.previous()}
		use:tooltip={TIPS.sampler.previous}
		aria-label="Previous target"
	>
		<span aria-hidden="true">←</span>
	</button>

	<div class="min-w-0 flex-1 text-center" aria-live="polite">
		<p class="text-sm font-semibold text-ink-soft">
			{words.group} · {session.index + 1} of {session.targets.length}
		</p>
		<p class="text-3xl font-bold">{words.where}</p>
		<p class="text-xl">
			{words.layer}
			{#if takes.kept}<span class="text-accent">· kept</span>{/if}
		</p>
		{#if words.note}<p class="mt-1 text-sm text-ink-soft">Should sound {words.note}</p>{/if}
		<p class="mt-2 text-sm text-ink-soft">{words.how}</p>
	</div>

	<button
		type="button"
		class="ui-button px-3 py-2"
		disabled={stepping || session.index === session.targets.length - 1}
		onclick={() => session.next()}
		use:tooltip={TIPS.sampler.next}
		aria-label="Next target"
	>
		<span aria-hidden="true">→</span>
	</button>
</div>

<p class="mt-1 text-center text-xs text-ink-faint">
	<KeyHint label={SHORTCUTS.previous.label} /><KeyHint label={SHORTCUTS.next.label} /> to move
</p>
