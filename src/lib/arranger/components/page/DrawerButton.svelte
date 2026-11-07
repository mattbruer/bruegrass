<script>
	/**
	 * A player-bar button that opens and closes one drawer. Same label either
	 * way (pressed in = open), so its width never changes.
	 *
	 * @type {{
	 *   id: import('../../state/PageLayoutState.svelte.js').DrawerId,
	 *   label: string,
	 *   tip: string,
	 *   icon: import('svelte').Snippet
	 * }}
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';

	let { id, label, tip, icon } = $props();

	const { layout } = useArranger();
</script>

<button
	type="button"
	class="flex items-center gap-2 ui-button px-3 py-2 sm:px-4"
	class:ui-button-on={layout.isOpen(id)}
	aria-expanded={layout.isOpen(id)}
	aria-controls="{id}-drawer"
	onclick={() => layout.toggle(id)}
	use:tooltip={tip}
>
	{@render icon()}
	<span class="max-sm:sr-only">{label}</span>
</button>
