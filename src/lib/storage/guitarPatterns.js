/**
 * Your guitar patterns, saved on this device for every song: how you
 * changed the guitar on one chord (arranger/instruments/guitarPatterns.js),
 * under a name. Async, like every saved document, so a backend can take over.
 */
import { savedCollection } from './collection.js';

/**
 * @typedef {import('$lib/arranger/instruments/guitarPatterns.js').GuitarPattern & {
 *   id: string, name: string, createdAt: string, updatedAt: string
 * }} SavedGuitarPattern
 */

const patterns = savedCollection('bruegrass.guitarPatterns');

/** @returns {Promise<SavedGuitarPattern[]>} by name */
export async function listGuitarPatterns() {
	return /** @type {SavedGuitarPattern[]} */ (patterns.list());
}

/**
 * @param {string} name
 * @param {import('$lib/arranger/instruments/guitarPatterns.js').GuitarPattern} pattern
 */
export async function saveGuitarPattern(name, pattern) {
	return patterns.save({ name, ...pattern });
}

/** @param {string} id */
export async function deleteGuitarPattern(id) {
	patterns.delete(id);
}
