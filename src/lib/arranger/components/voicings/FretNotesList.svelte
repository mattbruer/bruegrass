<script>
	/**
	 * The notes a shape sounds, one row per string: the string and fret,
	 * the note's letter, and what it is in the chord (red when it isn't one
	 * of the chord's own).
	 */
	import { writtenNote } from '../../chart/key.js';

	/**
	 * @type {{ notes: import('../../voicings/fretNotes.js').FretNote[], strings: string[] }}
	 *   strings: the strings' names, lowest first
	 */
	let { notes, strings } = $props();
</script>

<table class="notes">
	<tbody>
		{#each notes as note (note.string)}
			<tr class:outside={!note.inChord}>
				<th scope="row">{strings[note.string]} {note.fret}</th>
				<td class="letter">{writtenNote(note)}</td>
				<td>{note.words}{note.inChord ? '' : ' (not in the chord)'}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.notes {
		width: max-content;
		font-size: 0.875rem;
		border-collapse: collapse;
	}

	.notes th {
		padding: 0.15rem 0.75rem 0.15rem 0;
		text-align: left;
		font-weight: 400;
		color: var(--color-ink-soft);
		font-family: var(--font-mono, monospace);
	}

	.notes td {
		padding: 0.15rem 0.75rem 0.15rem 0;
	}

	.letter {
		font-weight: 700;
		min-width: 2rem;
	}

	.outside td {
		color: var(--color-danger);
	}
</style>
