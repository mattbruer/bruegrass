<script>
	/**
	 * Add an idea to your list: type it, press Enter (or Add). It's written
	 * to todo.json straight away, so Claude sees it in the next chat.
	 */
	import { enhance } from '$app/forms';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	let text = $state('');
	/** @type {HTMLInputElement | undefined} */
	let field = $state();

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	function afterAdding() {
		return async ({ update }) => {
			await update({ reset: false });
			text = '';
			field?.focus();
		};
	}
</script>

<form method="POST" action="?/add" class="mb-3 flex gap-2" use:enhance={afterAdding}>
	<input
		bind:this={field}
		bind:value={text}
		name="text"
		required
		maxlength="300"
		placeholder="Add an idea…"
		aria-label="New idea"
		autocomplete="off"
		class="min-w-0 flex-1 ui-field px-3 py-2 pointer-coarse:text-base"
	/>
	<button
		type="submit"
		class="ui-button px-4 py-2 ui-button-primary"
		disabled={!text.trim()}
		use:tooltip={TIPS.todo.add}
	>
		Add
	</button>
</form>
