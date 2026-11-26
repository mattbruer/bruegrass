<script>
	/**
	 * Patterns for the guitar's chord editor: Copy this chord's changes,
	 * Paste them onto another, or keep them as a named pattern for every
	 * song (Patterns ▾: use one, delete one, save this chord as one).
	 */
	import { onMount } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import Popover from '$lib/components/Popover.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { guitar } = useArranger();

	let naming = $state(false);

	onMount(() => {
		guitar.loadPatterns();
	});

	/** @param {import('$lib/storage/guitarPatterns.js').SavedGuitarPattern} pattern */
	function remove(pattern) {
		if (confirm(`Delete the pattern “${pattern.name}” from every song?`))
			guitar.deletePattern(pattern.id);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		class="ui-button px-3 py-1 text-sm"
		disabled={!guitar.pickedPattern}
		onclick={() => guitar.copy()}
		use:tooltip={TIPS.guitarEditor.copy}>Copy</button
	>
	<button
		type="button"
		class="ui-button px-3 py-1 text-sm"
		disabled={guitar.copied.length === 0}
		onclick={() => guitar.paste()}
		use:tooltip={TIPS.guitarEditor.paste}
		>Paste{#if guitar.copied.length > 0}<span class="ml-1 text-ink-soft"
				>({guitar.copied.length > 1
					? `${guitar.copied.length} chords from ${guitar.copied[0].chord}`
					: `from ${guitar.copied[0].chord}`})</span
			>{/if}</button
	>
	{#if guitar.range}
		<span class="text-sm text-ink-soft">Tap the last chord in the lane above.</span>
		<button
			type="button"
			class="ui-button px-3 py-1 text-sm"
			disabled={!guitar.rangeHasChanges}
			onclick={() => guitar.copyRange()}
			use:tooltip={TIPS.guitarEditor.copyBarsDone}
			>Copy {guitar.rangeChords.length}
			{guitar.rangeChords.length === 1 ? 'chord' : 'chords'}</button
		>
		<button
			type="button"
			class="ui-button px-3 py-1 text-sm"
			onclick={() => guitar.cancelRange()}
			use:tooltip={TIPS.guitarEditor.copyBarsCancel}>Cancel</button
		>
	{:else}
		<button
			type="button"
			class="ui-button px-3 py-1 text-sm"
			onclick={() => guitar.startRange()}
			use:tooltip={TIPS.guitarEditor.copyBars}>Copy bars…</button
		>
	{/if}
	<Popover class="px-3 py-1 text-sm" tip={TIPS.guitarEditor.patterns}>
		{#snippet button()}Patterns ▾{/snippet}
		<div class="menu flex flex-col gap-2">
			{#if guitar.patterns.length === 0}
				<p class="text-sm text-ink-soft">
					No patterns yet. Change how a chord is played, then save it here to use in any song.
				</p>
			{:else}
				<ul class="flex flex-col gap-1">
					{#each guitar.patterns as pattern (pattern.id)}
						<li class="flex items-center gap-1">
							<button
								type="button"
								class="flex-1 ui-button px-2.5 py-1 text-left text-sm"
								onclick={() => guitar.use(pattern)}
								use:tooltip={TIPS.guitarEditor.usePattern}
								>{pattern.name} <span class="text-ink-soft">· {pattern.chord}</span></button
							>
							<button
								type="button"
								class="ui-button px-2 py-1 text-sm"
								aria-label="Delete {pattern.name}"
								onclick={() => remove(pattern)}
								use:tooltip={TIPS.guitarEditor.deletePattern}>✕</button
							>
						</li>
					{/each}
				</ul>
			{/if}
			<button
				type="button"
				class="ui-button px-2.5 py-1 text-sm"
				disabled={!guitar.pickedPattern}
				onclick={() => (naming = true)}
				use:tooltip={TIPS.guitarEditor.savePattern}>Save this chord as a pattern…</button
			>
		</div>
	</Popover>
</div>

<NameDialog
	bind:open={naming}
	title="Save as a pattern"
	hint="A name you'll know it by in any song: G walk-up, accent the 2 and 4…"
	saveLabel="Save pattern"
	onsave={(name) => guitar.savePattern(name)}
/>

<style>
	.menu {
		width: min(18rem, 80vw);
		padding: 0.5rem;
	}
</style>
