<script>
	/**
	 * One column of the todo list: a heading, a line on what it's for, then
	 * the items (open ones first, done ones after), with room above the list
	 * for something like the add form. A numbered column (Claude's roadmap)
	 * shows each open item's step number.
	 */
	import TodoItem from './TodoItem.svelte';

	/**
	 * @type {{
	 *   title: string,
	 *   about: string,
	 *   column: import('$lib/server/todoList.js').Column,
	 *   items: import('$lib/server/todoList.js').TodoItem[],
	 *   empty: string,
	 *   numbered?: boolean,
	 *   top?: import('svelte').Snippet
	 * }}
	 *   numbered: the order matters (a roadmap), so open items show 1, 2, 3…
	 */
	let { title, about, column, items, empty, numbered = false, top } = $props();

	let sorted = $derived([
		...items.filter((item) => !item.done),
		...items.filter((item) => item.done)
	]);
	let openCount = $derived(items.filter((item) => !item.done).length);
</script>

<section class="ui-card p-4 sm:p-5" aria-label={title}>
	<header class="mb-3">
		<h2 class="flex items-baseline gap-2 text-lg font-bold">
			{title}
			<span class="text-sm font-normal text-ink-soft">{openCount} open</span>
		</h2>
		<p class="text-sm text-ink-soft">{about}</p>
	</header>

	{@render top?.()}

	{#if sorted.length === 0}
		<p class="ui-well p-4 text-sm text-ink-soft">{empty}</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each sorted as item, index (item.id)}
				<TodoItem {item} {column} step={numbered && !item.done ? index + 1 : null} />
			{/each}
		</ul>
	{/if}
</section>
