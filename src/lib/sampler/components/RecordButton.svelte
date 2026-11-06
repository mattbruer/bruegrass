<!--
	Record / Stop, with a dot that goes red while recording and the R key
	hint. The test take and the session both use it.
-->
<script>
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { SHORTCUTS } from '../keyboardShortcuts.js';
	import KeyHint from './KeyHint.svelte';

	/** @type {{ recording: boolean, disabled: boolean, tip: string, onclick: () => void }} */
	let { recording, disabled, tip, onclick } = $props();
</script>

<button
	type="button"
	class="ui-button px-4 py-2"
	class:ui-button-on={recording}
	{disabled}
	{onclick}
	use:tooltip={tip}
>
	<span class="record-dot" class:live={recording} aria-hidden="true"></span>
	{recording ? 'Stop' : 'Record'}
	<KeyHint label={SHORTCUTS.record.label} />
</button>

<style>
	.record-dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.35rem;
		border-radius: 50%;
		background: var(--color-ink-faint);
		vertical-align: 0.05em;
	}

	.record-dot.live {
		background: var(--meter-clip);
	}
</style>
