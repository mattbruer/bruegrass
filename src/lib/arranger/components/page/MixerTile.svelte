<script>
	/** The bar tile that opens the mixer. */
	import DrawerButton from './DrawerButton.svelte';
	import SlidersIcon from '../icons/SlidersIcon.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<DrawerButton id="mixer" label="Mixer" tip={TIPS.player.mixer}>
	{#snippet icon()}<SlidersIcon />{/snippet}
</DrawerButton>
