<script>
	/** Opens a FullScreen view. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ onOpen: () => void }} */
	let { onOpen } = $props();
</script>

<button
	type="button"
	class="ui-button px-4 py-2 text-sm"
	use:tooltip={TIPS.fullScreen.open}
	onclick={onOpen}
>
	Full screen
</button>
