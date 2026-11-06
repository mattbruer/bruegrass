<script>
	/**
	 * "What are you listening on?": your listening setups. Each one is every
	 * strip's EQ, tuned for one speaker or pair of headphones. Choose the one
	 * for what you're listening on now (this device remembers it and puts it
	 * on every song), save changes to it, save the EQs as a new one, or
	 * delete one.
	 *
	 * The wording says plainly what setups are for and that you should make
	 * one for each thing you listen on, because that's the whole point.
	 */
	import Dialog from '$lib/components/Dialog.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import {
		chooseSetup,
		deleteSetup,
		listening,
		saveAsNewSetup,
		saveSetupChanges,
		setupDiscardQuestion,
		setupHasUnsavedChanges,
		suggestedSetupNames,
		useEachSongsOwnEq
	} from '../../../playback/eq/listeningSetup.svelte.js';
	import { listeningDialog } from './listeningDialogState.svelte.js';

	let changed = $derived(setupHasUnsavedChanges());
	let nameDialogOpen = $state(false);
	let freeNames = $derived(suggestedSetupNames());

	/** Switching away from a setup with unsaved changes asks first. */
	function okToSwitch() {
		return !changed || confirm(setupDiscardQuestion());
	}

	/** @param {string} id */
	function choose(id) {
		if (id !== listening.setup?.id && okToSwitch()) chooseSetup(id);
	}

	function chooseNone() {
		if (listening.setup && okToSwitch()) useEachSongsOwnEq();
	}

	/** @param {import('$lib/storage/listeningSetups.js').ListeningSetup} setup */
	function remove(setup) {
		const inUse = setup.id === listening.setup?.id;
		const after = inUse ? ' The EQs stay as they are, as this song’s own.' : '';
		if (confirm(`Delete the listening setup “${setup.name}”?${after}`)) deleteSetup(setup.id);
	}
</script>

<Dialog bind:open={listeningDialog.open} title="What are you listening on?">
	<div class="px-6 pt-4 pb-6">
		<p class="max-w-md text-sm">
			Every speaker and pair of headphones sounds different. A mix that’s right on a laptop can
			sound thin on a phone and boomy in earbuds. So tune the EQs for what you’re listening on, and
			save them here as a <strong>listening setup</strong>. Make one for each speaker and pair of
			headphones you use.
		</p>
		<p class="mt-2 max-w-md text-sm text-ink-soft">
			This device remembers its setup and puts it on every song you open. Each device keeps its own.
		</p>

		{#if listening.setup && changed}
			<div class="mt-4 flex items-center justify-between gap-3 ui-well px-4 py-3 text-sm">
				<span>Unsaved EQ changes to <strong>{listening.setup.name}</strong></span>
				<button
					type="button"
					class="ui-button px-4 py-1.5 ui-button-primary"
					onclick={saveSetupChanges}
				>
					Save
				</button>
			</div>
		{/if}

		<ul class="mt-4 flex flex-col gap-3">
			{#each listening.setups as setup (setup.id)}
				{@const inUse = setup.id === listening.setup?.id}
				<li class="flex items-center gap-2">
					<button
						type="button"
						class="min-w-0 flex-1 ui-button px-4 py-2 text-left"
						class:ui-button-on={inUse}
						aria-current={inUse ? 'true' : undefined}
						onclick={() => choose(setup.id)}
					>
						<span class="block truncate">{setup.name}</span>
						{#if inUse}
							<span class="block text-xs font-normal text-ink-soft">In use on this device</span>
						{/if}
					</button>
					<button
						type="button"
						class="ui-button px-3 py-2 text-sm text-danger"
						aria-label="Delete {setup.name}"
						onclick={() => remove(setup)}
					>
						Delete
					</button>
				</li>
			{/each}
			{#if listening.setups.length}
				<li>
					<button
						type="button"
						class="w-full ui-button px-4 py-2 text-left"
						class:ui-button-on={!listening.setup}
						aria-current={!listening.setup ? 'true' : undefined}
						onclick={chooseNone}
					>
						<span class="block">No setup</span>
						<span class="block text-xs font-normal text-ink-soft">Each song’s own EQ</span>
					</button>
				</li>
			{/if}
		</ul>

		<div class="mt-5 flex justify-end">
			<button
				type="button"
				class="ui-button px-4 py-2"
				class:ui-button-primary={!listening.setup}
				onclick={() => (nameDialogOpen = true)}
			>
				Save the EQs as a new setup…
			</button>
		</div>
	</div>
</Dialog>

<NameDialog
	bind:open={nameDialogOpen}
	title="Save listening setup"
	suggestedName={freeNames[0] ?? ''}
	suggestions={freeNames}
	hint="Name it for what you’re listening on. It saves the EQ of every strip, and this device will use it on every song."
	saveLabel="Save setup"
	onsave={saveAsNewSetup}
/>
