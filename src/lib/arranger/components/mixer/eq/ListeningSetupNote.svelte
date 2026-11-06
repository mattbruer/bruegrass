<script>
	/**
	 * At the foot of the EQ window: a reminder of what EQ is for here. Every
	 * speaker and pair of headphones sounds different, so you're meant to
	 * tune the EQs for what you're listening on and keep them as a listening
	 * setup. While a setup is in use, its unsaved changes can be saved right
	 * here, without going back to the mixer; otherwise it opens the listening
	 * setups dialog.
	 */
	import {
		listening,
		saveSetupChanges,
		setupHasUnsavedChanges
	} from '../../../playback/eq/listeningSetup.svelte.js';
	import { openListeningDialog } from '../listening/listeningDialogState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	let changed = $derived(setupHasUnsavedChanges());
</script>

<div class="mt-4 ui-well px-4 py-3 text-sm">
	{#if listening.setup}
		<p>
			This EQ is part of <strong>{listening.setup.name}</strong>, your listening setup on this
			device. It stays on for every song.
		</p>
		{#if changed}
			<div class="mt-2 flex items-center justify-between gap-3">
				<span class="text-ink-soft">Unsaved changes</span>
				<button
					type="button"
					class="ui-button px-3 py-1.5 ui-button-primary"
					onclick={saveSetupChanges}
					use:tooltip={TIPS.eq.saveToSetup}
				>
					Save to {listening.setup.name}
				</button>
			</div>
		{/if}
	{:else}
		<p>
			<strong>Tune for what you’re listening on.</strong> A phone speaker, headphones and laptop speakers
			all sound different. Once it sounds right, save every strip’s EQ as a listening setup, and this
			device puts it back on every song.
		</p>
		<button
			type="button"
			class="mt-2 ui-button px-3 py-1.5 ui-button-primary"
			onclick={openListeningDialog}
			use:tooltip={TIPS.eq.openSetups}
		>
			Listening setups…
		</button>
	{/if}
</div>
