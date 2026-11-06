<script>
	/** The Export… button in the player: opens the Export dialog (audio or MIDI). */
	import ExportDialog from './ExportDialog.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	let open = $state(false);
</script>

<button
	type="button"
	class="ui-button px-4 py-2"
	aria-haspopup="dialog"
	onclick={() => (open = true)}
	use:tooltip={TIPS.player.export}
>
	Export…
</button>

<ExportDialog bind:open />
