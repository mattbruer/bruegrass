<script>
	/**
	 * Opens and closes one drawer (the editor, the mixer) from a page with its
	 * own controls (Tracks): a picture key, lit while its drawer is open. The
	 * player bar has its own tiles for the same (DrawerButton).
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
	class="key ui-button"
	class:ui-button-on={layout.isOpen(id)}
	aria-expanded={layout.isOpen(id)}
	aria-controls="{id}-drawer"
	onclick={() => layout.toggle(id)}
	use:tooltip={tip}
>
	{@render icon()}
	<span class="sr-only">{label}</span>
</button>

<style>
	.key {
		width: 3.25rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		padding: 0.2rem;
	}

	.key :global(svg) {
		height: 100%;
		width: auto;
	}
</style>
