/**
 * Which song is open, and saving it.
 *
 * The arranger always opens on the starter song, as a new, unsaved song.
 * Nothing is saved until you press Save: the first time it asks for a name,
 * after that it saves under that name. Songs open only when you choose them.
 */
import {
	createArrangement,
	deleteArrangement,
	getArrangement,
	listArrangements,
	saveArrangement
} from '$lib/storage/arrangements.js';
import { STARTER_SONG } from '../starterSong.js';
import { loadSongIntoPage, readSongFields } from './songFields.js';
import { applyRememberedMix, forgetSongMix } from './songMixMemory.svelte.js';

export class SongState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** The saved song that's open, or null for a new song that hasn't been saved. */
	savedId = /** @type {string | null} */ ($state(null));
	/** The open song's name ('' until it's saved). */
	name = $state('');
	/** The example this song started from, until it has a name of its own: it titles a new tune. */
	exampleName = $state('');

	/** The song's fields as last saved or opened, to tell whether anything has changed since. */
	#fieldsWhenSaved = $state('');

	/** Your saved songs, newest first (refresh with refreshSavedSongs). */
	savedSongs = /** @type {import('$lib/storage/arrangements.js').Arrangement[]} */ ($state.raw([]));

	isNew = $derived(this.savedId === null);
	hasUnsavedChanges = $derived(
		JSON.stringify(readSongFields(this.#arranger)) !== this.#fieldsWhenSaved
	);

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
		this.#rememberFieldsAsSaved(); // the starter song, as it opens, counts as unchanged
	}

	/** A name to offer when saving a new song: the tune's title, or its first section's. */
	get suggestedName() {
		return this.#arranger.title || 'My song';
	}

	/**
	 * Start a new song from the starter song or an example. (Ask about unsaved changes first.)
	 * @param {import('./songFields.js').SongFields} [from]
	 * @param {string} [exampleName]
	 */
	startNew(from = STARTER_SONG, exampleName = '') {
		loadSongIntoPage(this.#arranger, from);
		this.savedId = null;
		this.name = '';
		this.exampleName = exampleName;
		this.#rememberFieldsAsSaved();
	}

	/**
	 * Open one of your saved songs. (Ask about unsaved changes first.)
	 * @param {string} id
	 */
	open(id) {
		const song = getArrangement(id);
		if (!song) return;
		loadSongIntoPage(this.#arranger, song);
		this.savedId = song.id;
		this.name = song.title;
		this.exampleName = '';
		this.#rememberFieldsAsSaved();
		applyRememberedMix(id); // after the above, so a mix changed since the last Save shows as unsaved
	}

	/**
	 * Put back unsaved changes from a draft (see drafts.svelte.js): the saved
	 * song (or a new one) as it was saved, then the changes on top, so it
	 * shows as having unsaved changes, just as when you left.
	 * @param {{ savedId: string | null, name: string, fields: import('./songFields.js').SongFields }} draft
	 */
	restoreDraft(draft) {
		if (draft.savedId) this.open(draft.savedId);
		else this.startNew();
		loadSongIntoPage(this.#arranger, draft.fields);
	}

	/**
	 * Save the song. A new song needs a name; a saved one keeps its own
	 * unless a new name is given.
	 * @param {string} [name]
	 */
	save(name) {
		const fields = readSongFields(this.#arranger);
		const title = (name ?? this.name).trim() || this.suggestedName;
		const existing = this.savedId ? getArrangement(this.savedId) : null;
		const document = existing ?? createArrangement();

		const saved = saveArrangement({ ...document, ...fields, title });
		if (!this.savedId) forgetSongMix(null); // it has an id of its own now
		this.savedId = saved.id;
		this.name = saved.title;
		this.#rememberFieldsAsSaved();
		this.refreshSavedSongs();
	}

	/**
	 * Delete a saved song. If it's the one that's open, it stays on the page
	 * as a new, unsaved song (so leaving still asks before losing it).
	 * @param {string} id
	 */
	delete(id) {
		deleteArrangement(id);
		forgetSongMix(id);
		if (id === this.savedId) {
			this.savedId = null;
			this.name = '';
			this.#fieldsWhenSaved = ''; // nothing saved any more: it's all unsaved
		}
		this.refreshSavedSongs();
	}

	refreshSavedSongs() {
		this.savedSongs = listArrangements();
	}

	#rememberFieldsAsSaved() {
		this.#fieldsWhenSaved = JSON.stringify(readSongFields(this.#arranger));
	}
}
