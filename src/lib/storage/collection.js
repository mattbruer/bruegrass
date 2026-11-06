/**
 * A named collection of saved documents ({ id, name, ...fields }), kept
 * under one localStorage key as { [id]: document }. EQ presets and
 * listening setups both use this, so they're stored the same way.
 *
 * Like arrangements.js, nothing here knows about Svelte, so it can move to
 * a database later without the pages changing.
 */
import { readStored, writeStored } from './localStore.js';
import { newId } from './newId.js';

/**
 * @template {{ id: string, name: string, createdAt: string, updatedAt: string }} Doc
 * @param {string} storageKey
 * @param {(stored: any) => Doc | null} upgrade
 *   brings an older stored document up to the current shape, or returns
 *   null if it can't be used (then it's skipped)
 */
export function savedCollection(storageKey, upgrade) {
	/** @returns {Record<string, any>} */
	function allStored() {
		const stored = readStored(storageKey);
		return stored && typeof stored === 'object' ? stored : {};
	}

	return {
		/**
		 * Every document, in alphabetical order by name.
		 * @returns {Doc[]}
		 */
		list() {
			return Object.values(allStored())
				.map(upgrade)
				.filter((doc) => doc !== null)
				.sort((a, b) => a.name.localeCompare(b.name));
		},

		/**
		 * @param {string} id
		 * @returns {Doc | null}
		 */
		get(id) {
			const stored = allStored()[id];
			return stored ? upgrade(stored) : null;
		},

		/**
		 * Save a new document, or replace one with the same id.
		 * @param {Omit<Doc, 'id' | 'createdAt' | 'updatedAt'> & Partial<Doc>} doc
		 * @returns {Doc} the saved copy
		 */
		save(doc) {
			const now = new Date().toISOString();
			const saved = /** @type {Doc} */ ({
				...doc,
				id: doc.id ?? newId(),
				createdAt: doc.createdAt ?? now,
				updatedAt: now
			});
			writeStored(storageKey, { ...allStored(), [saved.id]: saved });
			return saved;
		},

		/** @param {string} id */
		delete(id) {
			const all = allStored();
			delete all[id];
			writeStored(storageKey, all);
		}
	};
}
