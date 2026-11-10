/**
 * Saved arrangements ("your songs").
 *
 * An arrangement is a plain document: an id, timestamps, and the fields
 * the arranger edits. Pages only ever go through these functions, never
 * storage directly, so where songs live can change without touching them:
 * today this browser's localStorage (a per-device copy that works offline);
 * later a database, with this copy as an offline draft that syncs up.
 *
 * Nothing here knows about Svelte, so it can move to a server or a sync
 * worker unchanged.
 */
import { readStored, removeStored, writeStored } from './localStore.js';
import { newId } from './newId.js';

/** Bump when the document's shape changes, and migrate older ones in `upgrade`. */
export const ARRANGEMENT_VERSION = 2;

/** Where every saved song is kept, as { [id]: Arrangement }. */
const SONGS_KEY = 'bruegrass.arrangements';

/**
 * Before songs were saved by name, the arranger reopened the last one it
 * autosaved, using this key. Songs now only open when you choose them, so
 * it's no longer needed (the songs themselves are kept).
 */
const RETIRED_LAST_OPENED_KEY = 'bruegrass.currentArrangement';

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   title: string,
 *   arrangement: string,
 *   abc: string,
 *   bass: string,
 *   tempo: number,
 *   capo: number,
 *   transpose: number,
 *   mix: object | null,
 *   createdAt: string,
 *   updatedAt: string
 * }} Arrangement
 *   title: the song's name; arrangement: the chord chart text; abc: the
 *   melody in ABC notation; bass: the bass line in ABC once it's been
 *   edited ('' while the band writes it from the chart); transpose: semitones from the Key setting;
 *   mix: the mixer's settings (see mixSnapshot in mixer.svelte.js);
 *   dates are ISO strings
 */

/**
 * A new song document, not yet saved.
 * @param {Partial<Arrangement>} [fields]
 * @returns {Arrangement}
 */
export function createArrangement(fields = {}) {
	const now = new Date().toISOString();
	return {
		title: '',
		arrangement: '',
		abc: '',
		bass: '',
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
 * Every saved song, most recently saved first.
 * @returns {Arrangement[]}
 */
export function listArrangements() {
	return Object.values(allSongs())
		.map(upgrade)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * One saved song, or null if there's no song with that id.
 * @param {string} id
 * @returns {Arrangement | null}
 */
export function getArrangement(id) {
	const song = allSongs()[id];
	return song ? upgrade(song) : null;
}

/**
 * Save a song (stamping when it was saved).
 * @param {Arrangement} song
 * @returns {Arrangement} the saved copy
 */
export function saveArrangement(song) {
	const saved = { ...song, version: ARRANGEMENT_VERSION, updatedAt: new Date().toISOString() };
	writeStored(SONGS_KEY, { ...allSongs(), [saved.id]: saved });
	return saved;
}

/**
 * Delete a saved song for good.
 * @param {string} id
 */
export function deleteArrangement(id) {
	const songs = allSongs();
	delete songs[id];
	writeStored(SONGS_KEY, songs);
}

/** @returns {Record<string, Arrangement>} */
function allSongs() {
	removeStored(RETIRED_LAST_OPENED_KEY);
	const songs = readStored(SONGS_KEY);
	return songs && typeof songs === 'object' ? songs : {};
}

/**
 * Bring an older saved document up to the current shape. Version 2 added
 * `bass` (the defaults fill it in: older songs play the generated bass).
 * @param {Arrangement} song
 * @returns {Arrangement}
 */
function upgrade(song) {
	return {
		...createArrangement(),
		...song,
		title: song.title || 'Untitled song',
		version: ARRANGEMENT_VERSION
	};
}
