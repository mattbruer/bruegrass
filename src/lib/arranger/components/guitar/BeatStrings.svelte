<script>
	/**
	 * What one beat plays, to change: for a boom, the string it picks (one
	 * of the shape's notes); for a chuck, the strings it strums (any of
	 * them). Muted strings in the shape can't be chosen.
	 */
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   role: 'boom' | 'chuck',
	 *   beatNumber: number,
	 *   chosen: number[],
	 *   notes: import('../../voicings/fretNotes.js').FretNote[],
	 *   strings: string[],
	 *   onChange: (chosen: number[]) => void
	 * }}
	 *   beatNumber: the beat in the bar, from 1; chosen: the strings the beat plays now; notes: the shape's notes, a string each
	 */
	let { role, beatNumber, chosen, notes, strings, onChange } = $props();

	/** @param {number} string */
	function choose(string) {
		if (role === 'boom') onChange([string]);
		else
			onChange(
				chosen.includes(string)
					? chosen.filter((each) => each !== string)
					: [...chosen, string].sort((a, b) => a - b)
			);
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm">
		{role === 'boom'
			? `Beat ${beatNumber} booms on which string?`
			: `Beat ${beatNumber} strums which strings?`}
	</span>
	<div class="flex flex-wrap gap-1.5" role={role === 'boom' ? 'radiogroup' : 'group'}>
		{#each notes as note (note.string)}
			{@const on = chosen.includes(note.string)}
			<button
				type="button"
				role={role === 'boom' ? 'radio' : 'checkbox'}
				aria-checked={on}
				class="flex flex-col items-center ui-button px-2.5 py-1 text-sm"
				class:ui-button-on={on}
				onclick={() => choose(note.string)}
				use:tooltip={role === 'boom' ? TIPS.guitarEditor.boomString : TIPS.guitarEditor.chuckString}
			>
				<span class="font-bold">{writtenNote(note)}</span>
				<span class="text-xs text-ink-soft">{strings[note.string]} string · {note.words}</span>
			</button>
		{/each}
	</div>
</div>
