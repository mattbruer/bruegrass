/**
 * Recorded takes, kept on this device: each one is saved the moment it's
 * recorded (or added from a file), so nothing is lost if the page closes.
 * They aren't part of the song document (audio is far too big for it); each
 * take names its song by id. When songs move to a database, this is the one
 * module that changes: the take documents go to the database, the audio to
 * file storage.
 *
 * In IndexedDB, in two stores:
 *   takes      each take's details (small: listed often)
 *   takeAudio  each take's audio, by the take's id (big: read one at a time);
 *              a take received in a shared song also keeps the file it came
 *              in (`sent`), so sharing the song again passes it on unchanged
 *   takeVideo  an A/V take's film, by the take's id (the file the camera made)
 */
import { askToKeepData, finished, keptOpen, result } from './indexedDb.js';
import { newId } from './newId.js';

const DATABASE = 'bruegrass.takes';
const DATABASE_VERSION = 2;

/**
 * @typedef {{
 *   id: string,
 *   songId: string,
 *   trackId: string,
 *   inUse: boolean,
 *   recordedAt: string,
 *   from: 'recording' | 'file',
 *   fileName: string,
 *   bpm: number,
 *   sounds?: number | null,
 *   sampleRate: number,
 *   seconds: number,
 *   startsAt: number,
 *   nudgeMs: number,
 *   latencyMs: number,
 *   quality: 'full' | 'compressed',
 *   video?: TakeVideo | null
 * }} TakeDocument
 *   sounds: the song's tonic as it sounded when this was made (takes/takeKey.js), so it follows the key;
 *   inUse: the take its track plays (one per track);
 *   startsAt: seconds from bar 1, already moved earlier by latencyMs (the delay measured when recording);
 *   nudgeMs: moved by ear on top of that;
 *   quality: 'compressed' when it arrived in a shared song (sent compressed), else 'full';
 *   video: an A/V take's film (missing or null: sound only)
 * @typedef {{ type: string, offset: number, nudgeMs: number, width: number, height: number }} TakeVideo
 *   type: the file's format (video/mp4…); offset: seconds into the film where the take's
 *   first sample is; nudgeMs: the picture moved later (negative: earlier) by eye, for a
 *   camera's own delay; width, height: the picture's size as filmed
 */

const database = keptOpen(DATABASE, DATABASE_VERSION, (db, oldVersion) => {
	if (oldVersion < 1) {
		db.createObjectStore('takes', { keyPath: 'id' }).createIndex('bySong', 'songId');
		db.createObjectStore('takeAudio', { keyPath: 'id' });
	}
	if (oldVersion < 2) db.createObjectStore('takeVideo', { keyPath: 'id' });
});

const ALL_STORES = ['takes', 'takeAudio', 'takeVideo'];

/**
 * A song's takes, oldest first.
 * @param {string} songId
 * @returns {Promise<TakeDocument[]>}
 */
export async function listTakes(songId) {
	const db = await database();
	const index = db.transaction('takes').objectStore('takes').index('bySong');
	/** @type {TakeDocument[]} */
	const takes = await result(index.getAll(songId));
	return takes.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

/**
 * Save a new take and its audio, and make it the one its track plays.
 * @param {Omit<TakeDocument, 'id' | 'inUse' | 'recordedAt' | 'quality'>} details
 * @param {Float32Array[]} channels
 * @param {Blob | null} [film] an A/V take's video (`details.video` says its format and offset)
 * @returns {Promise<TakeDocument>}
 */
export function addTake(details, channels, film = null) {
	return putTake(
		{
			...details,
			id: newId(),
			inUse: true,
			recordedAt: new Date().toISOString(),
			quality: 'full'
		},
		channels,
		{ film }
	);
}

/**
 * Save a take as it is (one received in a shared song keeps its id, so
 * receiving the song again doesn't add it twice). If it's in use, the
 * other takes on its track stop.
 * @param {TakeDocument} take
 * @param {Float32Array[]} channels
 * @param {{
 *   sent?: { bytes: Uint8Array, audio: import('$lib/arranger/share/takeFormat.js').TakeAudio } | null,
 *   film?: Blob | null
 * }} [files] sent: the file a received take came in; film: an A/V take's video
 * @returns {Promise<TakeDocument>}
 */
export async function putTake(take, channels, { sent = null, film = null } = {}) {
	const db = await database();
	const others = (await listTakes(take.songId)).filter((each) => each.trackId === take.trackId);

	const transaction = db.transaction(ALL_STORES, 'readwrite');
	const store = transaction.objectStore('takes');
	if (take.inUse)
		for (const other of others) if (other.inUse) store.put({ ...other, inUse: false });
	store.put(take);
	transaction
		.objectStore('takeAudio')
		.put(sent ? { id: take.id, channels, sent } : { id: take.id, channels });
	if (film) transaction.objectStore('takeVideo').put({ id: take.id, film });
	await finished(transaction);
	await askToKeepData();
	return take;
}

/**
 * Change a take's details (its nudge, or which take its track plays).
 * @param {TakeDocument} take
 */
export async function updateTake(take) {
	const db = await database();
	const transaction = db.transaction('takes', 'readwrite');
	transaction.objectStore('takes').put(take);
	await finished(transaction);
}

/**
 * Make this the take its track plays (the others on the track stop).
 * @param {TakeDocument} chosen
 */
export async function useTake(chosen) {
	const db = await database();
	const onTrack = (await listTakes(chosen.songId)).filter(
		(each) => each.trackId === chosen.trackId
	);
	const transaction = db.transaction('takes', 'readwrite');
	const store = transaction.objectStore('takes');
	for (const take of onTrack) store.put({ ...take, inUse: take.id === chosen.id });
	await finished(transaction);
}

/**
 * @param {string} id
 * @returns {Promise<Float32Array[] | null>}
 */
export async function readTakeAudio(id) {
	const db = await database();
	const stored = await result(db.transaction('takeAudio').objectStore('takeAudio').get(id));
	return stored?.channels ?? null;
}

/**
 * The file a received take came in (null: recorded or added here).
 * @param {string} id
 * @returns {Promise<{ bytes: Uint8Array, audio: import('$lib/arranger/share/takeFormat.js').TakeAudio } | null>}
 */
export async function readSentAudio(id) {
	const db = await database();
	const stored = await result(db.transaction('takeAudio').objectStore('takeAudio').get(id));
	return stored?.sent ?? null;
}

/**
 * An A/V take's film (null: sound only, or it's gone).
 * @param {string} id
 * @returns {Promise<Blob | null>}
 */
export async function readTakeVideo(id) {
	const db = await database();
	const stored = await result(db.transaction('takeVideo').objectStore('takeVideo').get(id));
	return stored?.film ?? null;
}

/**
 * Delete a take and its audio, for good.
 * @param {string} id
 */
export async function deleteTake(id) {
	const db = await database();
	const transaction = db.transaction(ALL_STORES, 'readwrite');
	for (const store of ALL_STORES) transaction.objectStore(store).delete(id);
	await finished(transaction);
}

/**
 * Delete every take of a song, with its audio (when the song is deleted).
 * @param {string} songId
 */
export async function deleteSongTakes(songId) {
	const takes = await listTakes(songId);
	if (takes.length === 0) return;
	const db = await database();
	const transaction = db.transaction(ALL_STORES, 'readwrite');
	for (const take of takes)
		for (const store of ALL_STORES) transaction.objectStore(store).delete(take.id);
	await finished(transaction);
}
