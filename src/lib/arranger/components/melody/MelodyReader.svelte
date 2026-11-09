<script>
	/**
	 * Reads the melody on a page that doesn't show the sheet music (the
	 * chart), so the band still plays it and edits still reach it. Draws
	 * it out of sight; see keepMelodyRead.svelte.js.
	 */
	import { useArranger } from '../../state/context.js';
	import { keepMelodyRead } from '../../melody/keepMelodyRead.svelte.js';

	const { arrangement, melody } = useArranger();

	/** @type {HTMLDivElement | undefined} */
	let hidden = $state();

	keepMelodyRead(
		melody,
		() => hidden,
		() => arrangement.transpose
	);
</script>

<!-- abcjs styles the element it draws into, so the hiding is done one level up -->
<div class="hidden" aria-hidden="true"><div bind:this={hidden}></div></div>
