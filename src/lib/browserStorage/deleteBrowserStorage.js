/**
 * Deleting what this site keeps in the browser, for good.
 */

/**
 * @param {'localStorage' | 'sessionStorage'} where
 * @param {string} key
 */
export function deleteKey(where, key) {
	globalThis[where].removeItem(key);
}

/**
 * Delete a whole IndexedDB database. The app's own pages let go of it when
 * asked (keptOpen in storage/indexedDb.js); an older copy open in another
 * tab may not.
 * @param {string} name
 * @returns {Promise<void>}
 */
export function deleteDatabase(name) {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
		request.onblocked = () =>
			reject(
				new Error(`${name} is open in another tab. Close the app’s other tabs and try again.`)
			);
	});
}

/** @param {string} name */
export async function deleteCache(name) {
	await caches.delete(name);
}

/** Delete everything this site keeps in the browser. */
export async function deleteEverything() {
	localStorage.clear();
	sessionStorage.clear();
	for (const { name } of (await indexedDB.databases?.()) ?? []) {
		if (name) await deleteDatabase(name);
	}
	for (const name of (await globalThis.caches?.keys()) ?? []) await deleteCache(name);
}
