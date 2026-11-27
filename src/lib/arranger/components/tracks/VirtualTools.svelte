<script>
	/**
	 * The picked bars' tools, in the Tracks page's control bar so they stay
	 * in view on a phone: Repeat (Logic's ⌘R: again and again), Copy and
	 * Paste (onto any virtual's lane), Clear, Take out (the rest pulled in),
	 * Insert (empty bars, the rest pushed on), the notes in the piano roll,
	 * and Done. Keys on a computer: R repeats, ⌘C and ⌘V, Delete clears, Esc lets go.
	 * `onEdit` opens a part's editor.
	 */
	import { useArranger } from '../../state/context.js';
	import { isTyping } from '$lib/utils/isTyping.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ onEdit: (lane: string) => void }} */
	let { onEdit } = $props();

	const { virtuals, parts, player } = useArranger();
	const tips = TIPS.tracks.virtuals;

	const picked = $derived(virtuals.picked);
	const playedAgain = $derived(virtuals.spans.length - 1);

	function editNotes() {
		if (!picked) return;
		if (!player.isPlaying && virtuals.spans[0]) player.goTo(virtuals.spans[0].from);
		onEdit(picked.lane);
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (!picked || event.defaultPrevented || isTyping(event) || event.altKey) return;
		const command = event.metaKey || event.ctrlKey;
		const key = event.key.toLowerCase();
		if (command && key === 'c') virtuals.copy();
		else if (command && key === 'v') virtuals.paste();
		else if (command) return;
		else if (key === 'r') virtuals.repeat();
		else if (key === 'delete' || key === 'backspace') virtuals.clear();
		else if (key === 'escape') virtuals.letGo();
		else return;
		event.preventDefault();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if picked}
	<div class="tools" role="group" aria-label="The picked bars">
		<div class="cluster">
			<span class="what">{parts.name(picked.lane)} · {virtuals.barsText}</span>
			{#if playedAgain > 0}
				<span class="again" use:tooltip={tips.playedAgain}>
					played {playedAgain + 1}×
				</span>
			{/if}
		</div>

		<div class="cluster">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				disabled={!virtuals.canRepeat}
				onclick={() => virtuals.repeat()}
				use:tooltip={tips.repeat}>Repeat</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => virtuals.copy()}
				use:tooltip={tips.copy}>Copy</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				disabled={!virtuals.copied}
				onclick={() => virtuals.paste()}
				use:tooltip={tips.paste}>Paste</button
			>
		</div>

		<div class="cluster">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => virtuals.clear()}
				use:tooltip={tips.clear}>Clear</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => virtuals.takeOut()}
				use:tooltip={tips.takeOut}>Take out</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={() => virtuals.insertBefore()}
				use:tooltip={tips.insert}>Insert</button
			>
		</div>

		<div class="cluster">
			<button
				type="button"
				class="ui-button px-3 py-1.5"
				onclick={editNotes}
				use:tooltip={tips.editNotes}>Notes…</button
			>
			<button
				type="button"
				class="ui-button px-3 py-1.5 ui-button-primary"
				onclick={() => virtuals.letGo()}
				use:tooltip={tips.done}>Done</button
			>
		</div>
	</div>
{:else if virtuals.copied}
	<div class="tools" role="status">
		<span class="hint">
			Copied {virtuals.copied.from}. Tap a bar on any part’s lane to paste it there.
		</span>
		<button
			type="button"
			class="ui-button px-3 py-1.5"
			onclick={() => (virtuals.copied = null)}
			use:tooltip={tips.forgetCopy}>Forget it</button
		>
	</div>
{/if}

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.5rem 1.25rem;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-line);
		font-size: 0.85rem;
	}

	.cluster {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	.what {
		max-width: 14rem;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 700;
	}

	.again,
	.hint {
		color: var(--color-ink-soft);
	}

	/* Phones: one row that scrolls sideways, so the sticky bar leaves room for the lanes */
	@container (max-width: 520px) {
		.tools {
			flex-wrap: nowrap;
			justify-content: flex-start;
			overflow-x: auto;
			column-gap: 0.75rem;
			padding-bottom: 0.25rem;
		}
		.tools[role='status'] {
			flex-wrap: wrap;
		}
	}
</style>
