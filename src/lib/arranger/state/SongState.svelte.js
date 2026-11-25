/**
 * Which song is open, and keeping it saved.
 *
 * Songs save themselves: every change to the open song is written to your
 * songs (autosave.svelte.js says when), so there's never anything unsaved to
 * ask about. The starter song and the examples are templates: the first
 * change makes one your own song, named for its tune. The page opens on the
 * song this device had open last.
 */
import {
	createArrangement,
	deleteArrangement,
	getArrangement,
	listArrangements,
	saveArrangement
} from '$lib/storage/arrangements.js';
import { deleteSongTakes } from '$lib/storage/songTakes.js';
import { rememberThisDevicesSong, thisDevicesSong } from '$lib/storage/thisDevice.js';
import { STARTER_SONG } from '../starterSong.js';
import { loadSongIntoPage, readSongFields } from './songFields.js';
import { uniqueName } from './uniqueName.js';
import { abcjsReady } from './abcjsLoaded.svelte.js';
import { NO_VIDEO } from '../video/songVideo.js';

export class SongState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** The open song's id among your songs, or null for a template you haven't changed yet. */
	savedId = /** @type {string | null} */ ($state(null));
	/** The open song's name ('' for a template). */
	name = $state('');
	/** The recording this song was transcribed from (its key and name), or null: most songs have none. */
	reference = /** @type {{ key: string, name: string } | null} */ ($state.raw(null));
	/** The recording whose transcription this song was sent from (Send to the arranger), or null. */
	madeFrom = /** @type {{ key: string, name: string } | null} */ ($state.raw(null));
	/** The names you gave the song's parts (melody/partNames.js). */
	partNames = /** @type {import('../melody/partNames.js').PartNames} */ ($state.raw({}));
	/** The lanes' order on the Tracks page, top to bottom, by id ([]: the usual order; tracks/laneOrder.js). */
	laneOrder = /** @type {string[]} */ ($state.raw([]));
	/** The audio lanes you've edited: their clips, by record track (takes/clips.js). */
	audioClips = /** @type {import('../takes/clips.js').EditedLanes} */ ($state.raw({}));
	/** The mandolin chops you've changed, by where their chord starts (instruments/chopEdits.js). */
	chops = /** @type {import('../instruments/chopEdits.js').ChopEdits} */ ($state.raw({}));
	/** What you've changed about the guitar's chords, by where each starts (instruments/guitarEdits.js). */
	guitarChords = /** @type {import('../instruments/guitarEdits.js').GuitarEdits} */ (
		$state.raw({})
	);
	/** Which audio lanes film (A/V lanes) and how their tiles are laid out (video/songVideo.js). */
	video = /** @type {import('../video/songVideo.js').SongVideo} */ ($state.raw(NO_VIDEO));
	/** The example this song started from, until it has a name of its own: it titles a new tune. */
	exampleName = $state('');
	/** The last song is open and its tune can be read (it names the song), so changes get saved from now on. */
	ready = $state(false);

	/** The saved document behind the open song (its id and when it was made). */
	#document = /** @type {import('$lib/storage/arrangements.js').Arrangement | null} */ (null);
	/** The song's fields as last written (or as opened), to tell when something has changed. */
	#lastWritten = $state('');

	/** Your songs, newest first (refresh with refreshSavedSongs). */
	savedSongs = /** @type {import('$lib/storage/arrangements.js').Arrangement[]} */ ($state.raw([]));

	isNew = $derived(this.savedId === null);
	hasChanged = $derived(JSON.stringify(readSongFields(this.#arranger)) !== this.#lastWritten);

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/** A name for a song that's never been saved: the tune's title, or its first section's. */
	get suggestedName() {
		return this.#arranger.title || 'My song';
	}

	/** Once the page is running: open the song this device had open last (else the starter). */
	async start() {
		await Promise.all([this.refreshSavedSongs(), abcjsReady()]);
		this.#markWritten(); // the starter song, as it opens, counts as unchanged
		const lastId = thisDevicesSong();
		if (lastId && (await getArrangement(lastId))) await this.open(lastId);
		this.ready = true;
	}

	/**
	 * Start a new song from the starter song or an example (the open one is saved first).
	 * @param {import('./songFields.js').SongFields} [from]
	 * @param {string} [exampleName]
	 */
	startNew(from = STARTER_SONG, exampleName = '') {
		this.saveNow();
		loadSongIntoPage(this.#arranger, from);
		this.#document = null;
		this.savedId = null;
		this.name = '';
		this.exampleName = exampleName;
		this.#markWritten();
		rememberThisDevicesSong(null);
	}

	/**
	 * Open one of your songs (the open one is saved first).
	 * @param {string} id
	 */
	async open(id) {
		this.saveNow();
		const song = await getArrangement(id);
		if (!song) return;
		loadSongIntoPage(this.#arranger, song);
		this.#document = song;
		this.savedId = song.id;
		this.name = song.title;
		this.exampleName = '';
		this.#markWritten();
		rememberThisDevicesSong(song.id);
	}

	/**
	 * Write the open song if it has changed. A template becomes your own song
	 * here, named for its tune. Everything it needs is read before the write,
	 * so opening another song straight after is safe.
	 */
	async saveNow() {
		if (!this.ready) return;
		const fields = readSongFields(this.#arranger);
		const written = JSON.stringify(fields);
		if (written === this.#lastWritten) return;
		this.#lastWritten = written;
		if (!this.#document) this.#becomeYourOwnSong();
		const document = /** @type {import('$lib/storage/arrangements.js').Arrangement} */ (
			this.#document
		);
		await saveArrangement({ ...document, ...fields, title: this.name });
		await this.refreshSavedSongs();
	}

	/** Make the open song your own now, even unchanged (a take needs a song to belong to). */
	async keepAsYourOwn() {
		if (!this.savedId) this.#lastWritten = '';
		await this.saveNow();
	}

	/** @param {string} name */
	async rename(name) {
		this.name = name.trim() || this.name || this.suggestedName;
		this.#lastWritten = ''; // so it's written even if nothing else changed
		await this.saveNow();
	}

	/**
	 * Delete one of your songs, and its takes. If it's the open one, the
	 * starter song opens instead.
	 * @param {string} id
	 */
	async delete(id) {
		await deleteArrangement(id);
		deleteSongTakes(id).catch((problem) =>
			console.error('Couldn’t delete the song’s takes', problem)
		);
		if (id === this.savedId) {
			this.#markWritten(); // nothing to save on the way out
			this.startNew();
		}
		await this.refreshSavedSongs();
	}

	async refreshSavedSongs() {
		this.savedSongs = await listArrangements();
	}

	#becomeYourOwnSong() {
		const taken = this.savedSongs.map((song) => song.title);
		this.name = uniqueName(this.name || this.suggestedName, taken);
		this.#document = createArrangement();
		this.savedId = this.#document.id;
		this.exampleName = '';
		rememberThisDevicesSong(this.savedId);
	}

	#markWritten() {
		this.#lastWritten = JSON.stringify(readSongFields(this.#arranger));
	}
}
