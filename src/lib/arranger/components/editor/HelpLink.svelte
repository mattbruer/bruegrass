<script>
	/**
	 * The round "?" that opens the guide to writing arrangements. It opens in
	 * a new tab, so the arrangement you're writing (and playback) carry on.
	 */
	import { resolve } from '$app/paths';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<a
	href={resolve('/arranger/help')}
	target="_blank"
	rel="noopener"
	use:tooltip={TIPS.editor.help}
	aria-label="How to write an arrangement (opens in a new tab)"
	class="flex h-8 w-8 items-center justify-center ui-button rounded-full text-sm font-bold"
>
	?
</a>
