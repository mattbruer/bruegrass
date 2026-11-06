<script>
	/**
	 * The app's todo list (dev only, on localhost): your ideas on the left,
	 * Claude's suggestions on the right. Everything is kept in todo.json.
	 */
	import TodoColumn from '$lib/todo/TodoColumn.svelte';
	import AddIdeaForm from '$lib/todo/AddIdeaForm.svelte';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>Todo · Bruegrass</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-8">
	<h1 class="mb-1 text-3xl font-bold">Todo</h1>
	<p class="mb-6 text-sm text-ink-soft">
		Where the app is going. Only here while you run it on this machine.
	</p>

	<div class="grid items-start gap-6 md:grid-cols-2">
		<TodoColumn
			title="My ideas"
			about="Things I want the app to do."
			column="mine"
			items={data.list.mine}
			empty="Nothing yet. Add your first idea above."
		>
			{#snippet top()}<AddIdeaForm />{/snippet}
		</TodoColumn>

		<TodoColumn
			title="Claude’s suggestions"
			about="A roadmap, in build order: each step sets up the next, so less gets redone. About 10 at a time; ask Claude about any of them."
			column="suggestions"
			numbered
			items={data.list.suggestions}
			empty="No suggestions right now."
		/>
	</div>
</main>
