<script>
	/**
	 * The records in one database store, read when opened: each one's key,
	 * size, and what's in it (audio summarised, not printed).
	 */
	import { readRecords } from '../readBrowserStorage.js';
	import { formatBytes, sizeOf } from '../describeValue.js';
	import StoredJson from './StoredJson.svelte';

	/** How many records to show (audio stores can hold hundreds of takes). */
	const SHOWN = 50;

	/** @type {{ database: string, store: string, count: number }} */
	let { database, store, count } = $props();

	const records = $derived(readRecords(database, store, SHOWN));
</script>

{#await records}
	<p class="note">Reading…</p>
{:then list}
	<ul class="records">
		{#each list as record (String(record.key))}
			<li>
				<details>
					<summary>
						<span class="key">{String(record.key)}</span>
						<span class="size">{formatBytes(sizeOf(record.value))}</span>
					</summary>
					<StoredJson value={record.value} />
				</details>
			</li>
		{/each}
	</ul>
	{#if count > list.length}
		<p class="note">…and {count - list.length} more.</p>
	{/if}
{:catch problem}
	<p class="note text-danger">Couldn’t read it: {problem.message}</p>
{/await}

<style>
	.records {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.25rem;
	}

	summary {
		display: flex;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.key {
		min-width: 0;
		font-family: ui-monospace, monospace;
		overflow-wrap: anywhere;
	}

	.size {
		margin-left: auto;
		color: var(--color-ink-soft);
		white-space: nowrap;
	}

	.note {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}
</style>
