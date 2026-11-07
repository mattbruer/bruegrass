<script>
	/** Play and Stop. */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { player } = useArranger();
</script>

<div class="flex gap-2">
	<button
		type="button"
		class="ui-button px-4 py-2 ui-button-primary sm:px-5"
		onclick={() => player.play()}
		use:tooltip={TIPS.player.play}
	>
		Play
	</button>
	<button
		type="button"
		class="ui-button px-3 py-2 sm:px-4"
		disabled={!player.isPlaying}
		onclick={() => player.stop()}
		use:tooltip={TIPS.player.stop}
	>
		Stop
	</button>
</div>
