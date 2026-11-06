/**
 * IndexedDB, the browser's database: for data too big for localStorage
 * (localStorage holds a few MB of text; a sampling session is hundreds of
 * MB of audio). It keeps typed arrays as they are, so audio goes in and
 * comes out as Float32Arrays without converting.
 *
 * Only these small promise wrappers live here; each kind of data has its
 * own module (samplingSessions.js) that says what it stores.
 */

/**
 * Open (and create or upgrade) a database.
 * @param {string} name
 * @param {number} version raise it when `upgrade` changes
 * @param {(database: IDBDatabase, oldVersion: number) => void} upgrade make stores and indexes
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase(name, version, upgrade) {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name, version);
		request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () =>
			reject(new Error(`${name} is open in another tab with an older version`));
	});
}

/**
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
export function result(request) {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Wait for a transaction's writes to be saved.
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
export function finished(transaction) {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error ?? new Error('Saving was cancelled'));
	});
}

/**
 * Ask the browser not to clear this site's data when the disk is low.
 * Without it, stored data is "best effort" and can be evicted. Returns
 * whether it's protected (browsers may say no; Chrome decides by itself).
 */
export async function askToKeepData() {
	try {
		return (await navigator.storage?.persist?.()) ?? false;
	} catch {
		return false;
	}
}
