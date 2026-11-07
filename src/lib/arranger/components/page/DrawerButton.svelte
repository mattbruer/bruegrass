<script>
	/**
	 * A player-bar tile that opens and closes one drawer. Same label either
	 * way (lit = open), so its size never changes.
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
	class="bar-tile ui-button"
	class:ui-button-on={layout.isOpen(id)}
	aria-expanded={layout.isOpen(id)}
	aria-controls="{id}-drawer"
	onclick={() => layout.toggle(id)}
	use:tooltip={tip}
>
	{@render icon()}
	<span class="tile-label">{label}</span>
</button>
