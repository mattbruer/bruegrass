/**
 * Everything this site keeps in the browser, read as it actually is (not
 * just what the app expects to find): localStorage, sessionStorage, the
 * IndexedDB databases, Cache Storage, and how much space it all takes.
 */
import { result } from '$lib/storage/indexedDb.js';

/**
 * @typedef {{ key: string, text: string, bytes: number }} StoredText
 * @typedef {{ name: string, version: number, stores: { name: string, count: number }[] }} StoredDatabase
 */

/**
 * Every key in localStorage or sessionStorage, by name.
 * @param {'localStorage' | 'sessionStorage'} where
 * @returns {StoredText[]}
 */
export function readKeys(where) {
	try {
		const storage = globalThis[where];
		return Object.keys(storage)
			.sort()
			.map((key) => {
				const text = storage.getItem(key) ?? '';
				return { key, text, bytes: (key.length + text.length) * 2 }; // stored as UTF-16
			});
	} catch {
		return []; // storage blocked
	}
}

/**
 * Every IndexedDB database, with how many records each of its stores holds.
 * Null when the browser can't list its databases.
 * @returns {Promise<StoredDatabase[] | null>}
 */
export async function readDatabases() {
	if (!indexedDB.databases) return null;
	const listed = await indexedDB.databases();
	const databases = [];
	for (const { name, version } of listed) {
		if (!name) continue;
		const db = await openExisting(name);
		try {
			const stores = [];
			for (const store of db.objectStoreNames) {
				const count = await result(db.transaction(store).objectStore(store).count());
				stores.push({ name: store, count });
			}
			databases.push({ name, version: version ?? db.version, stores });
		} finally {
			db.close(); // never hold it open: that would block deleting it
		}
	}
	return databases.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The first records of a store, each with its key and value.
 * @param {string} databaseName
 * @param {string} storeName
 * @param {number} limit
 * @returns {Promise<{ key: IDBValidKey, value: unknown }[]>}
 */
export async function readRecords(databaseName, storeName, limit) {
	const db = await openExisting(databaseName);
	try {
		const store = db.transaction(storeName).objectStore(storeName);
		const [keys, values] = await Promise.all([
			result(store.getAllKeys(null, limit)),
			result(store.getAll(null, limit))
		]);
		return keys.map((key, index) => ({ key, value: values[index] }));
	} finally {
		db.close();
	}
}

/** Cache Storage's caches, by name (the app doesn't use any yet). */
export async function readCacheNames() {
	try {
		return (await globalThis.caches?.keys()) ?? [];
	} catch {
		return [];
	}
}

/**
 * How much space the site uses, how much the browser allows, and whether
 * the browser has promised not to clear it when space runs low.
 */
export async function readUsage() {
	try {
		const { usage = 0, quota = 0 } = (await navigator.storage?.estimate?.()) ?? {};
		const protectedFromClearing = (await navigator.storage?.persisted?.()) ?? false;
		return { usage, quota, protectedFromClearing };
	} catch {
		return null;
	}
}

/**
 * Open a database that's already there, at its own version. (Opening by name
 * with no version would otherwise make an empty one, which the app would
 * then never set up.)
 * @param {string} name
 * @returns {Promise<IDBDatabase>}
 */
function openExisting(name) {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name);
		request.onupgradeneeded = () => request.transaction?.abort(); // it wasn't there after all
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error(`${name} isn’t there`));
	});
}
