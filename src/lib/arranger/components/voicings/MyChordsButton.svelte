<script>
	/** Opens My chords, your own guitar shapes. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import MyChordsDialog from './MyChordsDialog.svelte';

	let open = $state(false);
</script>

<button
	type="button"
	class="ml-auto ui-button px-3 py-1 text-sm"
	use:tooltip={TIPS.myChords.open}
	onclick={() => (open = true)}
>
	My chords
</button>

<MyChordsDialog bind:open />
