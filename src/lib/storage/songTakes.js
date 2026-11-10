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
 *   takeAudio  each take's audio, by the take's id (big: read one at a time)
 */
import { askToKeepData, finished, keptOpen, result } from './indexedDb.js';
import { newId } from './newId.js';

const DATABASE = 'bruegrass.takes';
const DATABASE_VERSION = 1;
/** The shape of a take document; raise it and convert in `upgrade` when it changes. */
export const TAKE_VERSION = 1;

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   songId: string,
 *   trackId: string,
 *   inUse: boolean,
 *   recordedAt: string,
 *   from: 'recording' | 'file',
 *   fileName: string,
 *   bpm: number,
 *   sampleRate: number,
 *   seconds: number,
 *   startsAt: number,
 *   nudgeMs: number,
 *   latencyMs: number
 * }} TakeDocument
 *   inUse: the take its track plays (one per track);
 *   startsAt: seconds from bar 1, already moved earlier by latencyMs (the delay measured when recording);
 *   nudgeMs: moved by ear on top of that
 */

const database = keptOpen(DATABASE, DATABASE_VERSION, (db) => {
	db.createObjectStore('takes', { keyPath: 'id' }).createIndex('bySong', 'songId');
	db.createObjectStore('takeAudio', { keyPath: 'id' });
});

/** @param {TakeDocument} take */
function upgrade(take) {
	return { ...take, version: TAKE_VERSION };
}

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
	return takes.map(upgrade).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

/**
 * Save a new take and its audio, and make it the one its track plays.
 * @param {Omit<TakeDocument, 'id' | 'version' | 'inUse' | 'recordedAt'>} details
 * @param {Float32Array[]} channels
 * @returns {Promise<TakeDocument>}
 */
export async function addTake(details, channels) {
	const db = await database();
	/** @type {TakeDocument} */
	const take = {
		...details,
		id: newId(),
		version: TAKE_VERSION,
		inUse: true,
		recordedAt: new Date().toISOString()
	};
	const others = (await listTakes(take.songId)).filter((each) => each.trackId === take.trackId);

	const transaction = db.transaction(['takes', 'takeAudio'], 'readwrite');
	const store = transaction.objectStore('takes');
	for (const other of others) if (other.inUse) store.put({ ...other, inUse: false });
	store.put(take);
	transaction.objectStore('takeAudio').put({ id: take.id, channels });
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
 * Delete a take and its audio, for good.
 * @param {string} id
 */
export async function deleteTake(id) {
	const db = await database();
	const transaction = db.transaction(['takes', 'takeAudio'], 'readwrite');
	transaction.objectStore('takes').delete(id);
	transaction.objectStore('takeAudio').delete(id);
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
	const transaction = db.transaction(['takes', 'takeAudio'], 'readwrite');
	for (const take of takes) {
		transaction.objectStore('takes').delete(take.id);
		transaction.objectStore('takeAudio').delete(take.id);
	}
	await finished(transaction);
}
