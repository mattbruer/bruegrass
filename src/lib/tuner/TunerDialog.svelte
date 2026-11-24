<script>
	/**
	 * The tuner in a dialog: it listens while it's open, and lets go of the
	 * microphone when it closes. Open it with `tuner.open()` from the click
	 * that shows it (browsers only start audio from a click). Its look
	 * (tunerLooks.js) is chosen at the top and remembered. It fills the
	 * window, and each look grows to fill the space it's given.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { TUNER_LOOKS, tunerLook } from './tunerLooks.js';
	import { settings } from '$lib/settings/settings.svelte.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ open: boolean, tuner: import('./TunerState.svelte.js').TunerState }} */
	let { open = $bindable(false), tuner } = $props();

	const Look = $derived(tunerLook(settings.tuner.look).component);

	$effect(() => {
		if (!open) tuner.close();
	});
</script>

<Dialog bind:open title="Tuner" full>
	<div class="flex min-h-0 flex-1 flex-col gap-3 px-3 pt-3 pb-3 sm:px-6 sm:pb-6">
		{#if tuner.status === 'error'}
			<p class="ui-well p-3 text-sm">{tuner.error}</p>
			<div class="flex justify-end">
				<button type="button" class="ui-button px-4 py-2" onclick={() => tuner.open()}
					>Try again</button
				>
			</div>
		{:else}
			<div class="flex justify-center">
				<TabSwitch
					tabs={TUNER_LOOKS}
					bind:value={settings.tuner.look}
					tips={TIPS.tuner.looks}
					label="How the tuner looks"
				/>
			</div>
			<div class="grid min-h-0 flex-1">
				<Look {tuner} />
			</div>
			<p class="truncate text-center text-xs text-ink-soft">
				{#if tuner.status === 'opening'}
					Opening the microphone…
				{:else}
					A = {tuner.referenceA} Hz · listening on {tuner.inputName || 'the microphone'}
				{/if}
			</p>
		{/if}
	</div>
</Dialog>
