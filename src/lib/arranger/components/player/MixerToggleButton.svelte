<script>
	/** Opens and closes the mixer drawer. Same label either way (pressed in = open), so its width never changes. */
	import { useArranger } from '../../state/context.js';
	import SlidersIcon from '../icons/SlidersIcon.svelte';

	const { layout } = useArranger();
</script>

<button
	type="button"
	class="flex items-center gap-2 ui-button px-4 py-2"
	class:ui-button-on={layout.mixerOpen}
	aria-expanded={layout.mixerOpen}
	aria-controls="mixer-drawer"
	onclick={() => (layout.mixerOpen = !layout.mixerOpen)}
>
	<SlidersIcon />
	Mixer
</button>
