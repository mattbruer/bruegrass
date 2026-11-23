<script>
	/**
	 * Undo and Redo for the Tracks page's edits (clips and the tempo lane).
	 * Keys on a computer: ⌘Z (Ctrl+Z) undoes, ⇧⌘Z (Ctrl+Y) redoes.
	 */
	import { useArranger } from '../../state/context.js';
	import { isTyping } from '$lib/utils/isTyping.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { history } = useArranger();

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (event.defaultPrevented || isTyping(event) || !(event.metaKey || event.ctrlKey)) return;
		const key = event.key.toLowerCase();
		const redo = (key === 'z' && event.shiftKey) || key === 'y';
		if (key !== 'z' && key !== 'y') return;
		event.preventDefault();
		if (redo) history.redo();
		else history.undo();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="ui-key-strip">
	<button
		type="button"
		class="ui-button"
		disabled={!history.canUndo}
		onclick={() => history.undo()}
		aria-label="Undo"
		use:tooltip={TIPS.tracks.undo}>↶</button
	>
	<button
		type="button"
		class="ui-button"
		disabled={!history.canRedo}
		onclick={() => history.redo()}
		aria-label="Redo"
		use:tooltip={TIPS.tracks.redo}>↷</button
	>
</div>

<style>
	button {
		width: 2.5rem;
		height: 2.5rem;
		font-size: 1.2rem;
	}
</style>
