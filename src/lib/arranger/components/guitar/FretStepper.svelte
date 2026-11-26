<script>
	/** One note's fret, a fret lower or higher: a run's note, or a boom off the shape. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ fret: number, maxFret: number, onChange: (fret: number) => void }} */
	let { fret, maxFret, onChange } = $props();

	/** @param {number} step */
	function move(step) {
		onChange(Math.min(maxFret, Math.max(0, fret + step)));
	}
</script>

<div class="flex items-center gap-1.5">
	<button
		type="button"
		class="ui-button px-3 py-1 text-sm"
		aria-label="A fret lower"
		disabled={fret <= 0}
		onclick={() => move(-1)}
		use:tooltip={TIPS.guitarEditor.fretDown}>−</button
	>
	<span class="min-w-16 text-center text-sm" aria-live="polite"
		>{fret === 0 ? 'open' : `fret ${fret}`}</span
	>
	<button
		type="button"
		class="ui-button px-3 py-1 text-sm"
		aria-label="A fret higher"
		disabled={fret >= maxFret}
		onclick={() => move(1)}
		use:tooltip={TIPS.guitarEditor.fretUp}>+</button
	>
</div>
