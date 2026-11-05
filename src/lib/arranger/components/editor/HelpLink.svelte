<script>
	/**
	 * The round "?" that opens the guide to writing arrangements. It opens in
	 * a new tab, so the arrangement you're writing (and playback) carry on.
	 */
	import { resolve } from '$app/paths';
</script>

<a
	href={resolve('/arranger/help')}
	target="_blank"
	rel="noopener"
	title="How to write an arrangement"
	aria-label="How to write an arrangement (opens in a new tab)"
	class="flex h-8 w-8 items-center justify-center ui-button rounded-full text-sm font-bold"
>
	?
</a>
