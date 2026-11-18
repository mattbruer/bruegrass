<script>
	/**
	 * Back to the start, shown while the loop is off (with it on, Play always
	 * starts at the top). Dimmed when the next Play starts there anyway.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import ToStartIcon from '../icons/ToStartIcon.svelte';

	const { loop, player } = useArranger();
</script>

{#if !loop.repeats}
	<button
		type="button"
		class="bar-tile ui-button"
		disabled={!player.isPlaying && player.resumeAt === 0}
		onclick={() => player.toStart()}
		use:tooltip={TIPS.player.toStart}
	>
		<ToStartIcon /><span class="tile-label">To the start</span>
	</button>
{/if}
