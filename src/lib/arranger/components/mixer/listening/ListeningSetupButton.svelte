<script>
	/**
	 * In the mixer's title row: what you're listening on (this device's
	 * listening setup). Tapping
	 * it opens the listening setups dialog.
	 *
	 * Small on purpose, so the mixer still fits a phone without scrolling;
	 * the explaining happens in the dialog.
	 */
	import HeadphonesIcon from '../../icons/HeadphonesIcon.svelte';
	import { listening } from '../../../mixer/listeningSetup.svelte.js';
	import { openListeningDialog } from './listeningDialogState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** With no setup yet, the button invites you to make one. */
	let label = $derived(listening.setup?.name ?? 'Tune for your speakers');
</script>

<button
	type="button"
	class="flex min-w-0 items-center gap-1.5 ui-button px-3 py-1 text-sm"
	class:ui-button-primary={!listening.setup}
	aria-label="Listening setup: {listening.setup?.name ?? 'none'}"
	onclick={openListeningDialog}
	use:tooltip={TIPS.mixer.listening}
>
	<HeadphonesIcon />
	<span class="truncate">{label}</span>
</button>
