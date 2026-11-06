<script>
	/**
	 * In the EQ window: load a saved preset onto this strip, save this strip's
	 * EQ as a new preset, or delete the preset you just loaded. Presets saved
	 * from this strip are listed first; the rest are there too, since a
	 * preset can go on any strip.
	 *
	 * The EQ window makes a fresh one for each strip, so nothing chosen carries
	 * over from the last strip.
	 */
	import { onMount } from 'svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import {
		deletePreset,
		eqPresets,
		loadPresetOntoStrip,
		presetsForStrip,
		refreshEqPresets,
		saveStripAsPreset
	} from '../../../playback/eq/eqPresets.svelte.js';
	import { listening } from '../../../playback/eq/listeningSetup.svelte.js';

	/** @type {{ stripId: string, stripName: string }} */
	let { stripId, stripName } = $props();

	let lists = $derived(presetsForStrip(stripId));
	let hasPresets = $derived(eqPresets.all.length > 0);

	/** The preset last loaded or saved here, so it can be deleted ('' for none). */
	let chosenId = $state('');
	let chosen = $derived(eqPresets.all.find((preset) => preset.id === chosenId));

	let saveDialogOpen = $state(false);

	/** Name a new preset after the strip, and what it's tuned for if a setup is in use. */
	let suggestedName = $derived(
		listening.setup ? `${stripName} – ${listening.setup.name}` : `${stripName} – `
	);

	onMount(refreshEqPresets);

	function load(/** @type {Event} */ event) {
		const id = /** @type {HTMLSelectElement} */ (event.currentTarget).value;
		chosenId = id;
		if (id) loadPresetOntoStrip(stripId, id);
	}

	function deleteChosen() {
		if (!chosen || !confirm(`Delete the preset “${chosen.name}”?`)) return;
		deletePreset(chosen.id);
		chosenId = '';
	}
</script>

<div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
	<label class="flex min-w-0 flex-1 items-center gap-2">
		<span class="font-semibold">Preset</span>
		<select
			class="min-w-0 flex-1 ui-field px-2 py-1.5 pointer-coarse:text-base"
			value={chosenId}
			onchange={load}
			disabled={!hasPresets}
		>
			<option value="">{hasPresets ? 'Load a preset…' : 'No presets saved yet'}</option>
			{#if lists.own.length}
				<optgroup label="Saved from {stripName}">
					{#each lists.own as preset (preset.id)}
						<option value={preset.id}>{preset.name}</option>
					{/each}
				</optgroup>
			{/if}
			{#if lists.others.length}
				<optgroup label="From other strips">
					{#each lists.others as preset (preset.id)}
						<option value={preset.id}>{preset.name}</option>
					{/each}
				</optgroup>
			{/if}
		</select>
	</label>

	{#if chosen}
		<button type="button" class="ui-button px-3 py-1.5" onclick={deleteChosen}>Delete</button>
	{/if}
	<button type="button" class="ui-button px-3 py-1.5" onclick={() => (saveDialogOpen = true)}>
		Save preset…
	</button>
</div>

<NameDialog
	bind:open={saveDialogOpen}
	title="Save {stripName} EQ preset"
	{suggestedName}
	hint="Saves just this strip’s EQ. Name it for what it’s for, like the speaker or headphones you tuned it on."
	onsave={(name) => (chosenId = saveStripAsPreset(stripId, name))}
/>
