<script>
	/**
	 * Which pages are showing, with arrows to step through them (for a
	 * mouse; on a touch screen you can also swipe the pages).
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ current: number, count: number, showing: number, onGoTo: (page: number) => void }} */
	let { current, count, showing, onGoTo } = $props();

	let last = $derived(Math.min(count, current + showing));
	let label = $derived(
		showing > 1 && last > current + 1
			? `Pages ${current + 1}–${last} of ${count}`
			: `Page ${current + 1} of ${count}`
	);
</script>

<nav class="mt-2 flex items-center justify-center gap-3 print:hidden" aria-label="Pages">
	<button
		type="button"
		class="h-10 w-10 ui-button rounded-full text-lg"
		disabled={current === 0}
		aria-label="Previous page"
		use:tooltip={TIPS.paper.previous}
		onclick={() => onGoTo(current - 1)}>‹</button
	>
	<span class="min-w-32 text-center text-sm text-ink-soft" aria-live="polite">{label}</span>
	<button
		type="button"
		class="h-10 w-10 ui-button rounded-full text-lg"
		disabled={last >= count}
		aria-label="Next page"
		use:tooltip={TIPS.paper.next}
		onclick={() => onGoTo(current + 1)}>›</button
	>
</nav>
