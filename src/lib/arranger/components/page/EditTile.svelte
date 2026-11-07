<script>
	/** The bar tile that opens the editor (chords and melody). */
	import DrawerButton from './DrawerButton.svelte';
	import PencilIcon from '../icons/PencilIcon.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<DrawerButton id="edit" label="Edit" tip={TIPS.player.edit}>
	{#snippet icon()}<PencilIcon />{/snippet}
</DrawerButton>
