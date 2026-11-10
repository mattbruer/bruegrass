<script>
	/**
	 * One stored thing (a localStorage key, a database, a cache): what it is,
	 * its raw name, its size, what's in it when opened, and Delete.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{
	 *   title: string, rawName: string, about?: string, summary: string,
	 *   onDelete: () => void, children: import('svelte').Snippet
	 * }}
	 */
	let { title, rawName, about = '', summary, onDelete, children } = $props();

	let open = $state(false); // what's in it is only read once you look
</script>

<li class="entry ui-card">
	<div class="head">
		<div class="min-w-0">
			<h3 class="font-bold">{title}</h3>
			<p class="raw">{rawName}</p>
		</div>
		<span class="summary">{summary}</span>
		<button
			type="button"
			class="ui-button px-3 py-1.5 text-sm text-danger"
			aria-label="Delete {title}"
			onclick={onDelete}
			use:tooltip={TIPS.storage.deleteOne}
		>
			Delete
		</button>
	</div>
	{#if about}<p class="about">{about}</p>{/if}
	<details bind:open>
		<summary use:tooltip={TIPS.storage.look}>What’s in it</summary>
		{#if open}{@render children()}{/if}
	</details>
</li>

<style>
	.entry {
		display: grid;
		gap: 0.5rem;
		padding: 0.9rem 1rem;
	}

	.head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: start;
		gap: 0.75rem;
	}

	.raw {
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
		color: var(--color-ink-faint);
		overflow-wrap: anywhere;
	}

	.about {
		margin-top: 0.25rem;
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}

	.summary {
		padding-top: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-ink-soft);
		white-space: nowrap;
	}

	summary {
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}
</style>
