/**
 * Saved arrangements.
 *
 * An arrangement is a plain document: an id, timestamps, and the fields a
 * page edits. Pages only ever go through these functions, never storage
 * directly, so where documents live can change without touching them:
 * today this browser's localStorage (a per-device copy that works offline);
 * later a database, with this copy as an offline draft that syncs up.
 *
 * Nothing here knows about Svelte, so it can move to a server or a sync
 * worker unchanged.
 */

/** Bump when the document's shape changes, and migrate older ones in `upgrade`. */
export const ARRANGEMENT_VERSION = 1;

const STORE_KEY = 'bruegrass.arrangements';
const CURRENT_KEY = 'bruegrass.currentArrangement';

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   title: string,
 *   arrangement: string,
 *   abc: string,
 *   tempo: number,
 *   capo: number,
 *   transpose: number,
 *   mix: object | null,
 *   createdAt: string,
 *   updatedAt: string
 * }} Arrangement
 *   arrangement: the chord chart text; abc: the melody in ABC notation;
 *   transpose: semitones from the Key setting; mix: the mixer's settings
 *   (see mixSnapshot in mixer.svelte.js); dates are ISO strings
 */

/**
 * A new arrangement document, not yet saved.
 * @param {Partial<Arrangement>} [fields]
 * @returns {Arrangement}
 */
export function createArrangement(fields = {}) {
	const now = new Date().toISOString();
	return {
		title: '',
		arrangement: '',
		abc: '',
		tempo: 120,
		capo: 0,
		transpose: 0,
		mix: null,
		...fields,
		id: newId(),
		version: ARRANGEMENT_VERSION,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * The arrangement you were last working on, if any.
 * @returns {Arrangement | null}
 */
export function currentArrangement() {
	const id = read(CURRENT_KEY);
	if (typeof id !== 'string') return null;
	const doc = allArrangements()[id];
	return doc ? upgrade(doc) : null;
}

/**
 * Save an arrangement (stamping its update time) and make it the current one.
 * @param {Arrangement} doc
 * @returns {Arrangement} the saved copy
 */
export function saveArrangement(doc) {
	const saved = { ...doc, version: ARRANGEMENT_VERSION, updatedAt: new Date().toISOString() };
	const all = allArrangements();
	all[saved.id] = saved;
	write(STORE_KEY, all);
	write(CURRENT_KEY, saved.id);
	return saved;
}

/**
 * Every saved arrangement, newest first (for a future library or sync).
 * @returns {Arrangement[]}
 */
export function listArrangements() {
	return Object.values(allArrangements())
		.map(upgrade)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** @returns {Record<string, Arrangement>} */
function allArrangements() {
	const all = read(STORE_KEY);
	return all && typeof all === 'object' ? all : {};
}

/**
 * Bring an older saved document up to the current shape.
 * @param {Arrangement} doc
 * @returns {Arrangement}
 */
function upgrade(doc) {
	return { ...createArrangement(), ...doc, version: ARRANGEMENT_VERSION };
}

function newId() {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {string} key */
function read(key) {
	try {
		const text = localStorage.getItem(key);
		return text === null ? null : JSON.parse(text);
	} catch {
		return null; // no storage (private mode, server render) or unreadable
	}
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function write(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// no storage or full: the arrangement lasts for this visit
	}
}
