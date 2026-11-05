<script>
	/** Play and Stop. */
	import { useArranger } from '../../state/context.js';

	const { player } = useArranger();
</script>

<div class="flex gap-2">
	<button type="button" class="ui-button px-5 py-2 ui-button-primary" onclick={() => player.play()}>
		Play
	</button>
	<button
		type="button"
		class="ui-button px-4 py-2"
		disabled={!player.isPlaying}
		onclick={() => player.stop()}
	>
		Stop
	</button>
</div>
