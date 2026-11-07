<script>
	/** One tile for Play and Stop: it plays when stopped and stops when playing. */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import PlayIcon from '../icons/PlayIcon.svelte';
	import StopIcon from '../icons/StopIcon.svelte';

	const { player } = useArranger();

	function toggle() {
		if (player.isPlaying) player.stop();
		else player.play();
	}
</script>

<button
	type="button"
	class="bar-tile ui-button"
	class:ui-button-primary={!player.isPlaying}
	onclick={toggle}
	use:tooltip={player.isPlaying ? TIPS.player.stop : TIPS.player.play}
>
	{#if player.isPlaying}
		<StopIcon /><span class="tile-label">Stop</span>
	{:else}
		<PlayIcon /><span class="tile-label">Play</span>
	{/if}
</button>
