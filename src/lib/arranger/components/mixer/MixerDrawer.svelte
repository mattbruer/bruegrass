<script>
	/** The mixer, in a drawer above the player bar, with what you're listening on beside its title. */
	import BottomDrawer from '../page/BottomDrawer.svelte';
	import Mixer from './Mixer.svelte';
	import ListeningSetupButton from './listening/ListeningSetupButton.svelte';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<BottomDrawer id="mixer" title="Mixer" closeTip={TIPS.mixer.close}>
	{#snippet heading()}
		<ListeningSetupButton />
	{/snippet}
	<Mixer />
</BottomDrawer>
