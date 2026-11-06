<script>
	/** Play, Stop, and the note-variation switch to A/B while playing. */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import VaryNotesButton from './VaryNotesButton.svelte';
	import VaryAmountSlider from './VaryAmountSlider.svelte';

	const { player } = useArranger();
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		class="ui-button px-5 py-2 ui-button-primary"
		onclick={() => player.play()}
		use:tooltip={TIPS.player.play}
	>
		Play
	</button>
	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!player.isPlaying}
		onclick={() => player.stop()}
		use:tooltip={TIPS.player.stop}
	>
		Stop
	</button>
	<VaryNotesButton />
	<VaryAmountSlider />
</div>
