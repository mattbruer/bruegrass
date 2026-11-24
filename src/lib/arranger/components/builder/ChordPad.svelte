<script>
	/**
	 * The chord buttons: the key's own chords, then any chord (a root, then
	 * its kind), then your own shapes. Tapping one picks it.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { NO_CHORD } from '../../chart/noChord.js';
	import { myChords } from '../../voicings/myChords.svelte.js';
	import {
		ACCIDENTALS,
		QUALITIES,
		ROOT_LETTERS,
		chordFrom,
		chordsInKey
	} from '../../builder/chordChoices.js';

	/**
	 * @type {{
	 *   songKey: import('../../chart/key.js').Key | null,
	 *   current: string,
	 *   onpick: (name: string) => void
	 * }} current: the chord picked now, lit
	 */
	let { songKey, current, onpick } = $props();

	let inKey = $derived(chordsInKey(songKey));
	let more = $state(false);
	let letter = $state('G');
	let accidental = $state('');
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex flex-wrap gap-1.5">
		{#each inKey as name (name)}
			{@render chord(name, TIPS.builder.keyChord)}
		{/each}
		{@render chord(NO_CHORD, TIPS.builder.noChord)}
		<button
			type="button"
			class="ui-button px-3 text-sm"
			class:ui-button-on={more}
			aria-expanded={more}
			use:tooltip={TIPS.builder.moreChords}
			onclick={() => (more = !more)}>More…</button
		>
	</div>

	{#if more}
		<div class="flex flex-wrap gap-1">
			{#each ROOT_LETTERS as root (root)}
				<button
					type="button"
					class="w-9 ui-button py-1 text-sm font-semibold"
					class:ui-button-on={letter === root}
					use:tooltip={TIPS.builder.root}
					onclick={() => (letter = root)}>{root}</button
				>
			{/each}
			<span class="w-2"></span>
			{#each ACCIDENTALS as { id, label } (id)}
				<button
					type="button"
					class="w-9 ui-button py-1 text-sm"
					class:ui-button-on={accidental === id}
					aria-label={id ? (id === '#' ? 'sharp' : 'flat') : 'natural'}
					use:tooltip={TIPS.builder.accidental}
					onclick={() => (accidental = id)}>{label}</button
				>
			{/each}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each QUALITIES as id (id)}
				{@const name = chordFrom(letter, accidental, id)}
				<button
					type="button"
					class="ui-button px-2.5 py-1 text-sm"
					disabled={!name}
					use:tooltip={TIPS.builder.quality}
					onclick={() => name && onpick(name)}>{letter}{accidental}{id}</button
				>
			{/each}
		</div>
	{/if}

	{#if myChords.all.length}
		<div class="flex flex-wrap gap-1.5">
			<span class="self-center text-xs text-ink-soft">Mine</span>
			{#each myChords.all as voicing (voicing.id)}
				{@render chord(voicing.name, TIPS.builder.mine)}
			{/each}
		</div>
	{/if}
</div>

{#snippet chord(/** @type {string} */ name, /** @type {string} */ tip)}
	<button
		type="button"
		class="min-w-12 ui-button px-2.5 py-2 text-base font-semibold"
		class:ui-button-on={current === name}
		use:tooltip={tip}
		onclick={() => onpick(name)}>{name}</button
	>
{/snippet}
