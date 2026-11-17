/**
 * Saved arrangements ("your songs").
 *
 * An arrangement is a plain document: an id, timestamps, and the fields
 * the arranger edits. Pages only ever go through these functions, never
 * storage directly, so where songs live can change without touching them:
 * today this browser's localStorage (a per-device copy that works offline);
 * later a database too. Every edit is written here, on this device (it
 * saves itself, arranger/state/autosave.svelte.js); the database is never
 * written per edit. A sync step will mark songs changed since they were
 * last sent and send them in one batch now and then (every 30 s or so, on
 * switching songs, when the page is hidden), and bring down other devices'
 * changes.
 *
 * Nothing here knows about Svelte, so it can move to a server or a sync
 * worker unchanged. Reading and writing are async already, though
 * localStorage isn't, so when songs move to a server (SvelteKit server
 * routes or an API) only the bodies here change, not the pages.
 */
import { readStored, removeStored, writeStored } from './localStore.js';
import { newId } from './newId.js';
import { DEFAULT_BASS_STYLE } from '$lib/arranger/instruments/bassStyles.js';

/** Bump when the document's shape changes, and migrate older ones in `upgrade`. */
export const ARRANGEMENT_VERSION = 6;

/** Where every saved song is kept, as { [id]: Arrangement }. */
const SONGS_KEY = 'bruegrass.arrangements';

/**
 * An older way of remembering the last song opened (now storage/thisDevice.js
 * keeps it, since each device has its own), cleared when seen.
 */
const RETIRED_LAST_OPENED_KEY = 'bruegrass.currentArrangement';

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   title: string,
 *   arrangement: string,
 *   abc: string,
 *   tune: import('$lib/arranger/melody/sections/tuneBySection.js').TuneBySection | null,
 *   bass: string,
 *   bassTune: import('$lib/arranger/melody/sections/tuneBySection.js').TuneBySection | null,
 *   bassStyle: string,
 *   tab: Record<string, import('$lib/arranger/tab/songTab.svelte.js').PartTab>,
 *   recording: { key: string, name: string } | null,
 *   tempo: number,
 *   capo: number,
 *   transpose: number,
 *   mix: object | null,
 *   createdAt: string,
 *   updatedAt: string
 * }} Arrangement
 *   title: the song's name; arrangement: the chord chart text; abc: the
 *   melody in ABC notation (as played); tune: the melody kept by section,
 *   each section's bars (null: kept whole, in abc); bass: the bass line in ABC once it's been
 *   edited ('' while the band writes it from the chart); bassTune: the bass line kept by
 *   section (null: kept whole, in bass); bassStyle: how the band
 *   writes its own bass line, an id in BASS_STYLES; tab: each part's TAB instrument
 *   and the strings chosen for its notes, and its tuning if not standard (tab/songTab.svelte.js); recording: the
 *   recording it was transcribed from (its key and name), if any; transpose: semitones from the Key setting;
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
		tune: null,
		bass: '',
		bassTune: null,
		bassStyle: DEFAULT_BASS_STYLE,
		tab: {},
		recording: null,
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
 * @returns {Promise<Arrangement[]>}
 */
export async function listArrangements() {
	return Object.values(allSongs())
		.map(upgrade)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * One saved song, or null if there's no song with that id.
 * @param {string} id
 * @returns {Promise<Arrangement | null>}
 */
export async function getArrangement(id) {
	const song = allSongs()[id];
	return song ? upgrade(song) : null;
}

/**
 * Save a song (stamping when it was saved).
 * @param {Arrangement} song
 * @returns {Promise<Arrangement>} the saved copy
 */
export async function saveArrangement(song) {
	const saved = { ...song, version: ARRANGEMENT_VERSION, updatedAt: new Date().toISOString() };
	writeStored(SONGS_KEY, { ...allSongs(), [saved.id]: saved });
	return saved;
}

/**
 * Delete a saved song for good.
 * @param {string} id
 */
export async function deleteArrangement(id) {
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
 * `bass` (the defaults fill it in: older songs play the generated bass);
 * version 3 `bassStyle` (it was a device setting before: older songs get the default);
 * version 4 `tab` (older songs have none); version 5 `recording` (none: a
 * song transcribed earlier gets it when its recording is opened again); version 6
 * `tune` and `bassTune` (older songs keep their tune and bass line whole).
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
