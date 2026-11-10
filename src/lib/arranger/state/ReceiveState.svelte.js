/**
 * A song someone sent, waiting for you to open it: from a share link (the
 * page opened with one, or one was pasted into the address bar) or a song
 * file. Opening it saves it among your songs straight away (so nothing
 * received is lost, even if an iPhone closes the page) and opens it.
 * The link stays in the address bar until it's answered, so a reload asks again.
 */
import { replaceState } from '$app/navigation';
import { hasSharedSong, songFromLink } from '../share/shareLink.js';
import { readSongFile } from '../share/songFile.js';
import { receiveSong, yourCopyOf } from '../share/receiveSong.js';
import { ShareProblem } from '../share/songPackage.js';
import { forgetSongMix } from './songMixMemory.svelte.js';

/**
 * @typedef {{
 *   songPackage: import('../share/songPackage.js').SongPackage,
 *   audioFiles: Map<string, Uint8Array>,
 *   yourCopy: import('$lib/storage/arrangements.js').Arrangement | null
 * }} Offer
 */

export class ReceiveState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** The song waiting to be opened (null: none). */
	offer = $state.raw(/** @type {Offer | null} */ (null));
	/** What went wrong reading or saving it. */
	problem = $state('');
	/** What the last song received wants you to know (shown until closed). */
	notes = $state.raw(/** @type {string[]} */ ([]));
	busy = $state(false);

	showing = $derived(this.offer !== null || this.problem !== '' || this.notes.length > 0);

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/** @param {string} hash the page's address after `#` */
	async fromLink(hash) {
		if (!hasSharedSong(hash)) return;
		await this.#read(async () => ({
			songPackage: await songFromLink(hash),
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- received data, not UI state
			audioFiles: new Map()
		}));
	}

	/** @param {File} file */
	async fromFile(file) {
		await this.#read(async () => {
			const { songPackage, files } = await readSongFile(new Uint8Array(await file.arrayBuffer()));
			return { songPackage, audioFiles: files };
		});
	}

	/**
	 * Save it among your songs and open it. (Ask about unsaved changes first.)
	 * @param {{ asNewSong: boolean }} options
	 */
	async accept({ asNewSong }) {
		if (!this.offer) return;
		const { song, recording } = this.#arranger;
		this.busy = true;
		try {
			const received = await receiveSong(this.offer.songPackage, this.offer.audioFiles, {
				asNewSong
			});
			forgetSongMix(received.songId); // the mix that came with it, not one remembered here
			song.open(received.songId);
			song.refreshSavedSongs();
			await recording.refreshTakes();
			this.notes = received.notes;
			this.offer = null;
			forgetLink();
		} catch (problem) {
			this.problem = `The song couldn’t be saved: ${problem instanceof Error ? problem.message : problem}`;
		} finally {
			this.busy = false;
		}
	}

	close() {
		this.offer = null;
		this.problem = '';
		this.notes = [];
		forgetLink();
	}

	/** @param {() => Promise<{ songPackage: Offer['songPackage'], audioFiles: Offer['audioFiles'] }>} read */
	async #read(read) {
		this.problem = '';
		this.notes = [];
		try {
			const { songPackage, audioFiles } = await read();
			this.offer = { songPackage, audioFiles, yourCopy: yourCopyOf(songPackage) };
		} catch (problem) {
			this.problem =
				problem instanceof ShareProblem ? problem.message : 'That song couldn’t be read.';
		}
	}
}

function forgetLink() {
	if (!hasSharedSong(location.hash)) return;
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- this page's own address, already resolved
	replaceState(location.pathname + location.search, {});
}
