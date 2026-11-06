<script>
	/**
	 * One item on the todo list: tick it done, delete it, and (for Claude's
	 * suggestions) move it to your list. Each button is a small form posting
	 * to the page's actions, so it works even before the page's code loads.
	 */
	import { enhance } from '$app/forms';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   item: import('$lib/server/todoList.js').TodoItem,
	 *   column: import('$lib/server/todoList.js').Column,
	 *   step?: number | null
	 * }}
	 *   step: its place in a roadmap, shown before the text (null: none)
	 */
	let { item, column, step = null } = $props();
</script>

<li class="item" class:done={item.done}>
	<form method="POST" action="?/toggle" use:enhance>
		<input type="hidden" name="column" value={column} />
		<input type="hidden" name="id" value={item.id} />
		<button
			type="submit"
			class="check"
			class:on={item.done}
			aria-pressed={item.done}
			aria-label="Done: {item.text}"
			use:tooltip={item.done ? TIPS.todo.undone : TIPS.todo.done}
		>
			{item.done ? '✓' : ''}
		</button>
	</form>

	<span class="text">
		{#if step !== null}<span class="step">{step}</span>{/if}{item.text}
	</span>

	{#if column === 'suggestions' && !item.done}
		<form method="POST" action="?/adopt" use:enhance>
			<input type="hidden" name="id" value={item.id} />
			<button
				type="submit"
				class="ui-button px-2 py-1 text-xs"
				aria-label="Move to my list: {item.text}"
				use:tooltip={TIPS.todo.adopt}
			>
				← Mine{step !== null ? ` (${step})` : ''}
			</button>
		</form>
	{/if}

	<form method="POST" action="?/remove" use:enhance>
		<input type="hidden" name="column" value={column} />
		<input type="hidden" name="id" value={item.id} />
		<button
			type="submit"
			class="remove"
			aria-label="Delete: {item.text}"
			use:tooltip={TIPS.todo.remove}
		>
			✕
		</button>
	</form>
</li>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-radius: var(--corner-control);
		background: var(--color-surface);
		padding: 0.6rem 0.75rem;
		box-shadow: var(--shadow-raised-small);
	}

	.text {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	/* The roadmap step, in the accent colour */
	.step {
		margin-right: 0.45rem;
		font-weight: 800;
		color: var(--color-accent);
	}

	.done .text {
		color: var(--color-ink-soft);
		text-decoration: line-through;
	}

	/* A round, sunk tick box that fills with the accent when done */
	.check {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 9999px;
		background: var(--color-surface);
		font-size: 0.85rem;
		font-weight: 800;
		color: white;
		box-shadow: var(--shadow-inset-small);
	}

	.check.on {
		background: var(--color-accent);
	}

	.remove {
		flex-shrink: 0;
		padding: 0.25rem 0.4rem;
		font-size: 0.8rem;
		color: var(--color-ink-faint);
	}

	@media (hover: hover) {
		.remove:hover {
			color: var(--color-danger, var(--color-accent));
		}
	}
</style>
