<script>
	/**
	 * In the mixer's title row: what you're listening on (this device's
	 * listening setup), with a dot if its EQs have unsaved changes. Tapping
	 * it opens the listening setups dialog.
	 *
	 * Small on purpose, so the mixer still fits a phone without scrolling;
	 * the explaining happens in the dialog.
	 */
	import UnsavedDot from '$lib/components/UnsavedDot.svelte';
	import HeadphonesIcon from '../../icons/HeadphonesIcon.svelte';
	import { listening, setupHasUnsavedChanges } from '../../../playback/eq/listeningSetup.svelte.js';
	import { openListeningDialog } from './listeningDialogState.svelte.js';

	let changed = $derived(setupHasUnsavedChanges());
	/** With no setup yet, the button invites you to make one. */
	let label = $derived(listening.setup?.name ?? 'Tune for your speakers');
</script>

<button
	type="button"
	class="flex min-w-0 items-center gap-1.5 ui-button px-3 py-1 text-sm"
	class:ui-button-primary={!listening.setup}
	aria-label="Listening setup: {listening.setup?.name ?? 'none'}{changed
		? ', unsaved changes'
		: ''}"
	onclick={openListeningDialog}
>
	<HeadphonesIcon />
	<span class="truncate">{label}</span>
	{#if changed}<UnsavedDot />{/if}
</button>
