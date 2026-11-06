<script>
	/**
	 * My chords: your own guitar shapes, typed as frets. Pick one to change
	 * it; the form below adds a new one. Saved on this device for every song.
	 */
	import { untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { useArranger } from '../../state/context.js';
	import { ChordForm } from '../../voicings/ChordForm.svelte.js';
	import { deleteMyChord, myChords, saveMyChord } from '../../voicings/myChords.svelte.js';
	import { writeFrets } from '../../voicings/typedFrets.js';

	let { open = $bindable(false) } = $props();

	const { player } = useArranger();
	const form = new ChordForm();
	let restored = $state(false);
	/** Problems show once you try to save, not while you're still typing. */
	let triedToSave = $state(false);

	// As it opens, with nothing typed yet: pick up anything typed on a visit before
	$effect(() => {
		if (!open) return;
		untrack(() => {
			if (!form.hasChanges) restored = form.restoreDraft();
		});
	});

	$effect(() => {
		if (open) form.keepDraft();
	});

	/** @param {import('$lib/storage/chordVoicings.js').ChordVoicing | null} voicing */
	function edit(voicing) {
		form.edit(voicing);
		restored = false;
		triedToSave = false;
	}

	function save(/** @type {SubmitEvent} */ event) {
		event.preventDefault();
		triedToSave = true;
		if (form.problem) return;
		saveMyChord(form.toVoicing());
		edit(null);
		player.restartIfPlaying();
	}

	function remove() {
		if (!form.id || !confirm(`Delete your ${form.name} shape?`)) return;
		deleteMyChord(form.id);
		edit(null);
		player.restartIfPlaying();
	}
</script>

<Dialog bind:open title="My chords">
	<div class="max-w-md px-6 pt-4 pb-6">
		<p class="text-sm text-ink-soft">
			Your own guitar shapes, for every song on this device. Write the name in the chart to play it:
			a new chord like <code>Cadd9</code>, or a second shape like <code>G:high</code>.
		</p>

		{#if myChords.all.length}
			<ul class="mt-4 flex flex-wrap gap-2">
				{#each myChords.all as voicing (voicing.id)}
					<li>
						<button
							type="button"
							class="ui-button px-3 py-1.5 font-mono text-sm"
							class:ui-button-on={voicing.id === form.id}
							use:tooltip={TIPS.myChords.pick}
							onclick={() => edit(voicing)}
						>
							{voicing.name} <span class="text-ink-soft">{writeFrets(voicing.frets)}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<form class="mt-5" onsubmit={save}>
			<h3 class="mb-2 font-semibold">{form.id ? `Change ${form.name || 'shape'}` : 'New shape'}</h3>
			{#if restored}
				<p class="mb-2 text-sm text-ink-soft">Picked up what you were typing last time.</p>
			{/if}
			<div class="flex flex-wrap gap-3">
				<label class="block w-32">
					<span class="mb-1 block text-sm">Name</span>
					<input
						bind:value={form.name}
						placeholder="Cadd9"
						maxlength="20"
						autocapitalize="off"
						autocomplete="off"
						spellcheck="false"
						use:tooltip={TIPS.myChords.name}
						class="w-full ui-field px-3 py-2 font-mono pointer-coarse:text-base"
					/>
				</label>
				<label class="block min-w-40 flex-1">
					<span class="mb-1 block text-sm">Frets, low E to high e</span>
					<input
						bind:value={form.fretsText}
						placeholder="x,3,2,0,3,0"
						maxlength="30"
						autocapitalize="off"
						autocomplete="off"
						spellcheck="false"
						use:tooltip={TIPS.myChords.frets}
						class="w-full ui-field px-3 py-2 font-mono pointer-coarse:text-base"
					/>
				</label>
			</div>
			<p class="mt-2 text-sm" class:text-danger={triedToSave && form.problem}>
				{#if triedToSave && form.problem}
					{form.problem}
				{:else if form.replacesBuiltIn}
					Plays instead of the built-in {form.name.trim()} in every song.
				{:else}
					x for a muted string. The capo is added on top.
				{/if}
			</p>

			<div class="mt-4 flex flex-wrap justify-end gap-3">
				{#if form.id}
					<button
						type="button"
						class="mr-auto ui-button px-4 py-2"
						use:tooltip={TIPS.myChords.delete}
						onclick={remove}
					>
						Delete
					</button>
					<button
						type="button"
						class="ui-button px-4 py-2"
						use:tooltip={TIPS.myChords.new}
						onclick={() => edit(null)}
					>
						New
					</button>
				{/if}
				<button
					type="submit"
					class="ui-button px-5 py-2 ui-button-primary"
					use:tooltip={TIPS.myChords.save}
				>
					Save
				</button>
			</div>
		</form>
	</div>
</Dialog>
