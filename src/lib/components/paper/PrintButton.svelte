<script>
	/** Print what's on paper (or save it as a PDF), without the rest of the page. */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<button
	type="button"
	class="ui-button px-4 py-2 text-sm"
	use:tooltip={TIPS.paper.print}
	onclick={() => window.print()}
>
	Print
</button>
