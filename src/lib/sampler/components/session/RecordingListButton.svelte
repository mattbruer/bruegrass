<!--
	Opens the recording list for a checklist (and its session, if one is open).
-->
<script>
	import RecordingList from './RecordingList.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   checklist: import('../../checklists/guitar.js').Checklist,
	 *   session?: import('../../session/RecordingSession.svelte.js').RecordingSession | null,
	 *   label?: string
	 * }}
	 */
	let { checklist, session = null, label = 'What to record' } = $props();

	let open = $state(false);
</script>

<button
	type="button"
	class="ui-button px-3 py-1.5 text-sm"
	onclick={() => (open = true)}
	use:tooltip={TIPS.sampler.recordingList}
>
	{label}
</button>

<RecordingList bind:open {checklist} {session} />
