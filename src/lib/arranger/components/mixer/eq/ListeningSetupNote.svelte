<script>
	/**
	 * At the foot of the EQ window: a reminder of what EQ is for here. Every
	 * speaker and pair of headphones sounds different, so you're meant to
	 * tune the EQs for what you're listening on and keep them as a listening
	 * setup. While a setup is in use, changes here save into it; otherwise
	 * it opens the listening setups dialog. On a phone it shrinks to one line, so the EQ window fits.
	 */
	import { listening } from '../../../mixer/listeningSetup.svelte.js';
	import { openListeningDialog } from '../listening/listeningDialogState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<!-- On a phone it's one short line, so the EQ window fits; the full explanation is in the setups dialog -->
<div class="mt-4 ui-well px-4 py-3 text-sm max-sm:mt-3 max-sm:px-3 max-sm:py-2">
	{#if listening.setup}
		<p>
			<span class="max-sm:hidden">This EQ is part of</span><span class="sm:hidden">Part of</span>
			<strong>{listening.setup.name}</strong><span class="max-sm:hidden"
				>, your listening setup on this device. It stays on for every song.</span
			><span class="sm:hidden">, on every song.</span>
		</p>
	{:else}
		<div class="flex items-center justify-between gap-3 max-sm:gap-2">
			<p>
				<strong>Tune for what you’re listening on.</strong>
				<span class="max-sm:hidden">
					A phone speaker, headphones and laptop speakers all sound different. Once it sounds right,
					save every strip’s EQ as a listening setup, and this device puts it back on every song.
				</span>
			</p>
			<button
				type="button"
				class="shrink-0 ui-button px-3 py-1.5 ui-button-primary sm:hidden"
				onclick={openListeningDialog}
				use:tooltip={TIPS.eq.openSetups}
			>
				Setups…
			</button>
		</div>
		<button
			type="button"
			class="mt-2 ui-button px-3 py-1.5 ui-button-primary max-sm:hidden"
			onclick={openListeningDialog}
			use:tooltip={TIPS.eq.openSetups}
		>
			Listening setups…
		</button>
	{/if}
</div>
