<script>
	/**
	 * A shape's frets as typed, lowest string first (`5,3,2,x`): a change
	 * that reads as a shape is passed on as it's typed, so the diagram
	 * follows; one that doesn't says why under it. `note` is what to say
	 * while nothing's wrong.
	 */
	import { readFrets, writeFrets } from '../../voicings/typedFrets.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';

	/**
	 * @type {{
	 *   frets: (number | null)[],
	 *   neck: import('../../voicings/typedFrets.js').FrettedNeck,
	 *   note: string,
	 *   tip: string,
	 *   onChange: (frets: (number | null)[]) => void
	 * }}
	 */
	let { frets, neck, note, tip, onChange } = $props();

	/** What's typed: the shape's frets, until you type. */
	let typed = $derived(writeFrets(frets));
	const problem = $derived(readFrets(typed, neck).error);

	/** @param {string} text */
	function type(text) {
		typed = text;
		const read = readFrets(text, neck);
		if (read.frets && writeFrets(read.frets) !== writeFrets(frets)) onChange(read.frets);
	}
</script>

<label class="block">
	<span class="mb-1 block text-sm">Frets, {neck.order}</span>
	<input
		value={typed}
		oninput={(event) => type(event.currentTarget.value)}
		placeholder={neck.example}
		maxlength="24"
		autocapitalize="off"
		autocomplete="off"
		spellcheck="false"
		aria-invalid={problem !== ''}
		use:tooltip={tip}
		class="w-44 ui-field px-3 py-2 font-mono pointer-coarse:text-base"
	/>
</label>
<p class="text-sm" class:text-danger={problem} role={problem ? 'alert' : undefined}>
	{problem || note}
</p>
