<script>
	/**
	 * Any JSON value as a tree: objects and arrays fold open and shut,
	 * text with line breaks keeps them. The first two levels start open.
	 */
	import JsonTree from './JsonTree.svelte';

	/** @type {{ value: any, name?: string, depth?: number }} */
	let { value, name = '', depth = 0 } = $props();

	let isBranch = $derived(value !== null && typeof value === 'object');
	let entries = $derived(isBranch ? Object.entries(value) : []);
	let summary = $derived(Array.isArray(value) ? `[ ${entries.length} ]` : `{ ${entries.length} }`);
</script>

{#if isBranch}
	<details open={depth < 2}>
		<summary class="cursor-pointer">
			{#if name}<span class="text-ink-soft">{name}:</span>{/if}
			<span class="text-ink-soft">{summary}</span>
		</summary>
		<div class="ml-2 border-l border-current/20 pl-3">
			{#each entries as [key, child] (key)}
				<JsonTree value={child} name={key} depth={depth + 1} />
			{/each}
		</div>
	</details>
{:else}
	<div class="flex gap-2">
		{#if name}<span class="shrink-0 text-ink-soft">{name}:</span>{/if}
		<span class="min-w-0 wrap-anywhere whitespace-pre-wrap"
			>{typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}</span
		>
	</div>
{/if}
