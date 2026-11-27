<script>
	/**
	 * Undo and Redo, saying before you press what they'd take back and where
	 * ("Repeat 4 bars · Melody, bars 9–12"), since on a phone the change may
	 * be off the screen. The lanes then show the place (TracksView). Keys on
	 * a computer: ⌘Z, ⇧⌘Z (Ctrl on Windows).
	 */
	import { useArranger } from '../../state/context.js';
	import { whereText } from '../../virtuals/describeWhere.js';
	import { isTyping } from '$lib/utils/isTyping.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { history, chartBars, parts } = useArranger();

	/** @param {import('../../state/EditHistory.svelte.js').Step | null} step */
	function describe(step) {
		if (!step) return '';
		const where = whereText(chartBars, step.where, (lane) => parts.name(lane));
		return where ? `${step.label} · ${where}` : step.label;
	}

	const undoText = $derived(describe(history.nextUndo));
	const redoText = $derived(describe(history.nextRedo));

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (event.defaultPrevented || isTyping(event) || !(event.metaKey || event.ctrlKey)) return;
		if (event.key.toLowerCase() !== 'z') return;
		event.preventDefault();
		if (event.shiftKey) history.redo();
		else history.undo();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="undo" role="group" aria-label="Undo and Redo">
	<div class="keys ui-key-strip">
		<button
			type="button"
			class="ui-button"
			disabled={!history.canUndo}
			onclick={() => history.undo()}
			aria-label={undoText ? `Undo ${undoText}` : 'Undo'}
			use:tooltip={TIPS.tracks.undo}>↶</button
		>
		<button
			type="button"
			class="ui-button"
			disabled={!history.canRedo}
			onclick={() => history.redo()}
			aria-label={redoText ? `Redo ${redoText}` : 'Redo'}
			use:tooltip={TIPS.tracks.redo}>↷</button
		>
	</div>
	<span class="next" aria-hidden="true">
		{#if undoText}
			<span class="verb">Undo</span> {undoText}
		{:else if redoText}
			<span class="verb">Redo</span> {redoText}
		{:else}
			Nothing to undo
		{/if}
	</span>
</div>

<style>
	.undo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.keys {
		height: 2.5rem;
	}

	.keys .ui-button {
		width: 2.75rem;
		display: grid;
		place-items: center;
		font-size: 1.3rem;
		line-height: 1;
	}

	.next {
		max-width: 13rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}

	.verb {
		font-weight: 700;
		color: var(--color-ink);
	}
</style>
