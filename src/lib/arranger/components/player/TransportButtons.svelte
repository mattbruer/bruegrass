<script>
	/** Play, Stop, and the note-variation switch to A/B while playing. */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import FeelControls from './FeelControls.svelte';

	const { player } = useArranger();
</script>

<div class="flex gap-2">
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
</div>

<!-- Listening tests: A/B the hand's feel, the note variation and each strum pattern -->
<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
	<div class="flex items-center gap-2"><FeelControls /></div>
</div>
