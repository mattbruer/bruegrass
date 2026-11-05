/**
 * Reading and writing JSON in this browser's localStorage, safely: storage
 * can be missing (server rendering), blocked (private browsing) or full,
 * and none of that should break the app.
 */

/**
 * The value stored under `key`, or null if there's none (or it can't be read).
 * @param {string} key
 */
export function readStored(key) {
	try {
		const text = localStorage.getItem(key);
		return text === null ? null : JSON.parse(text);
	} catch {
		return null;
	}
}

/**
 * Store `value` under `key`. Returns false if it couldn't be stored.
 * @param {string} key
 * @param {unknown} value
 */
export function writeStored(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

/** @param {string} key */
export function removeStored(key) {
	try {
		localStorage.removeItem(key);
	} catch {
		// nothing to remove from
	}
}
