<script>
	/**
	 * Everything the app keeps in this browser, as it actually is: how much
	 * space it takes, each localStorage key and database (what it is, its
	 * size, what's in it), and Delete for each one or for everything.
	 */
	import { onMount } from 'svelte';
	import { askToKeepData } from '$lib/storage/indexedDb.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { KNOWN_DATABASES, KNOWN_KEYS } from '../knownStorage.js';
	import { formatBytes } from '../describeValue.js';
	import { readCacheNames, readDatabases, readKeys, readUsage } from '../readBrowserStorage.js';
	import {
		deleteCache,
		deleteDatabase,
		deleteEverything,
		deleteKey
	} from '../deleteBrowserStorage.js';
	import StoredEntry from './StoredEntry.svelte';
	import StoredJson from './StoredJson.svelte';
	import StoreRecords from './StoreRecords.svelte';

	let local = $state.raw(/** @type {import('../readBrowserStorage.js').StoredText[]} */ ([]));
	let session = $state.raw(/** @type {import('../readBrowserStorage.js').StoredText[]} */ ([]));
	let databases = $state.raw(
		/** @type {import('../readBrowserStorage.js').StoredDatabase[] | null} */ ([])
	);
	let cacheNames = $state.raw(/** @type {string[]} */ ([]));
	let usage = $state.raw(/** @type {Awaited<ReturnType<typeof readUsage>>} */ (null));
	let problem = $state('');
	let loaded = $state(false);

	const nothingStored = $derived(
		local.length + session.length + (databases?.length ?? 0) + cacheNames.length === 0
	);

	async function refresh() {
		local = readKeys('localStorage');
		session = readKeys('sessionStorage');
		[databases, cacheNames, usage] = await Promise.all([
			readDatabases(),
			readCacheNames(),
			readUsage()
		]);
		loaded = true;
	}

	onMount(() => {
		refresh();
	});

	/**
	 * @param {string} title
	 * @param {() => unknown} remove
	 */
	async function confirmAndDelete(title, remove) {
		if (!confirm(`Delete “${title}” from this browser, for good?`)) return;
		problem = '';
		try {
			await remove();
		} catch (error) {
			problem = error instanceof Error ? error.message : String(error);
		}
		await refresh();
	}

	async function deleteAll() {
		const warning =
			'Delete everything the app keeps in this browser, for good? Saved songs, takes, settings, presets and drafts all go. Downloaded files on your device are not touched.';
		if (!confirm(warning)) return;
		problem = '';
		try {
			await deleteEverything();
			location.reload(); // start afresh, with nothing left in memory to save it back
		} catch (error) {
			problem = error instanceof Error ? error.message : String(error);
			await refresh();
		}
	}

	async function protect() {
		await askToKeepData();
		usage = await readUsage();
	}

	/** @param {import('../readBrowserStorage.js').StoredText} entry */
	function keySummary({ key, text, bytes }) {
		const items = KNOWN_KEYS[key]?.items;
		const value = parsed(text);
		const count = items && value && typeof value === 'object' ? Object.keys(value).length : null;
		const counted = items && count !== null ? `${count} ${items[count === 1 ? 0 : 1]}` : '';
		return [counted, formatBytes(bytes)].filter(Boolean).join(' · ');
	}

	/** @param {string} text */
	function parsed(text) {
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}

	/** @param {import('../readBrowserStorage.js').StoredDatabase} database */
	function recordCount(database) {
		const total = database.stores.reduce((sum, store) => sum + store.count, 0);
		return `${total} ${total === 1 ? 'record' : 'records'}`;
	}
</script>

{#snippet keyList(/** @type {'localStorage' | 'sessionStorage'} */ where, entries)}
	<ul class="list">
		{#each entries as entry (entry.key)}
			<StoredEntry
				title={KNOWN_KEYS[entry.key]?.name ?? entry.key}
				rawName={entry.key}
				about={KNOWN_KEYS[entry.key]?.about ?? 'Not something this app knows about.'}
				summary={keySummary(entry)}
				onDelete={() =>
					confirmAndDelete(KNOWN_KEYS[entry.key]?.name ?? entry.key, () =>
						deleteKey(where, entry.key)
					)}
			>
				<StoredJson value={parsed(entry.text)} />
			</StoredEntry>
		{/each}
	</ul>
{/snippet}

<section class="usage ui-card">
	{#if usage}
		<p>
			Using <strong>{formatBytes(usage.usage)}</strong> of the {formatBytes(usage.quota)} this browser
			allows the app.
		</p>
		{#if usage.protectedFromClearing}
			<p class="soft">Protected: the browser won’t clear it when the device runs low on space.</p>
		{:else}
			<p class="soft">
				Not protected: the browser may clear it if the device runs low on space, or after weeks
				without a visit (Safari).
			</p>
			<button
				type="button"
				class="ui-button px-3 py-1.5 text-sm"
				onclick={protect}
				use:tooltip={TIPS.storage.protect}
			>
				Ask the browser to keep it
			</button>
		{/if}
	{/if}
	<p class="soft">
		Each browser and each device keeps its own copy; nothing here leaves this device. If the app is
		open in another tab, it may save some things again.
	</p>
</section>

{#if problem}
	<p class="text-danger" role="alert">{problem}</p>
{/if}

{#if loaded && nothingStored}
	<p class="soft">Nothing stored. The app starts fresh here.</p>
{/if}

{#if local.length > 0}
	<h2>Small things <span class="soft">(localStorage)</span></h2>
	{@render keyList('localStorage', local)}
{/if}

{#if session.length > 0}
	<h2>For this tab only <span class="soft">(sessionStorage)</span></h2>
	{@render keyList('sessionStorage', session)}
{/if}

{#if databases === null}
	<p class="soft">This browser can’t list its databases, so they aren’t shown.</p>
{:else if databases.length > 0}
	<h2>Audio and big things <span class="soft">(IndexedDB)</span></h2>
	<ul class="list">
		{#each databases as database (database.name)}
			{@const known = KNOWN_DATABASES[database.name]}
			<StoredEntry
				title={known?.name ?? database.name}
				rawName={database.name}
				about={known?.about ?? 'Not something this app knows about.'}
				summary={recordCount(database)}
				onDelete={() =>
					confirmAndDelete(known?.name ?? database.name, () => deleteDatabase(database.name))}
			>
				{#each database.stores as store (store.name)}
					<details class="store">
						<summary>
							{known?.stores[store.name] ?? store.name}
							<span class="soft">· {store.count}</span>
						</summary>
						<StoreRecords database={database.name} store={store.name} count={store.count} />
					</details>
				{/each}
			</StoredEntry>
		{/each}
	</ul>
{/if}

{#if cacheNames.length > 0}
	<h2>Caches</h2>
	<ul class="list">
		{#each cacheNames as name (name)}
			<StoredEntry
				title={name}
				rawName={name}
				summary=""
				onDelete={() => confirmAndDelete(name, () => deleteCache(name))}
			>
				<p class="soft">Files the browser keeps for working offline.</p>
			</StoredEntry>
		{/each}
	</ul>
{/if}

{#if loaded && !nothingStored}
	<button
		type="button"
		class="delete-all ui-button px-4 py-3 text-danger"
		onclick={deleteAll}
		use:tooltip={TIPS.storage.deleteAll}
	>
		Delete everything
	</button>
{/if}

<style>
	.usage {
		display: grid;
		gap: 0.4rem;
		justify-items: start;
		padding: 1rem;
	}

	h2 {
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		font-size: 1.15rem;
		font-weight: 700;
	}

	.list {
		display: grid;
		gap: 0.6rem;
	}

	.soft {
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--color-ink-soft);
	}

	.store {
		margin-top: 0.4rem;
		padding-left: 0.75rem;
	}

	.store summary {
		cursor: pointer;
		font-size: 0.85rem;
	}

	.delete-all {
		margin-top: 2rem;
		font-weight: 700;
	}
</style>
