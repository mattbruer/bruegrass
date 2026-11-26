<script>
	/**
	 * One picked note, for a run between chords: its string, and its fret
	 * stepped down or up (any fret, on the shape or off it). Shows the note
	 * and what it is in the chord.
	 */
	import { writtenNote } from '../../chart/key.js';
	import { fretNotes } from '../../voicings/fretNotes.js';
	import FretStepper from './FretStepper.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   note: import('../../instruments/guitarEdits.js').PickedNote,
	 *   strings: string[],
	 *   open: number[],
	 *   maxFret: number,
	 *   chordName: string,
	 *   onChange: (note: import('../../instruments/guitarEdits.js').PickedNote) => void
	 * }}
	 *   strings: the strings' names, lowest first; open: their open MIDI pitches
	 */
	let { note, strings, open, maxFret, chordName, onChange } = $props();

	const named = $derived(
		fretNotes(
			strings.map((_, string) => (string === note.string ? note.fret : null)),
			open,
			chordName
		)[0] ?? null
	);
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-3">
		<span class="text-sm">The note:</span>
		{#if named}
			<span class="text-lg font-bold">{writtenNote(named)}</span>
			<span class="text-sm text-ink-soft">{named.words}</span>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Which string">
		{#each strings as name, string (string)}
			<button
				type="button"
				role="radio"
				aria-checked={note.string === string}
				class="ui-button px-2.5 py-1 text-sm font-bold"
				class:ui-button-on={note.string === string}
				aria-label="{name} string"
				onclick={() => onChange({ string, fret: note.fret })}
				use:tooltip={TIPS.guitarEditor.noteString}>{name}</button
			>
		{/each}
	</div>
	<FretStepper
		fret={note.fret}
		{maxFret}
		onChange={(fret) => onChange({ string: note.string, fret })}
	/>
</div>
