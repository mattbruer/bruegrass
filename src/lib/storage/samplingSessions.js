/**
 * Sampling sessions, kept on this computer: every take is saved the moment
 * it's recorded, so a crash, a reload or a closed tab loses nothing, and a
 * session can be picked up another day.
 *
 * In IndexedDB (localStorage is far too small for audio), in three stores:
 *   sessions   one document per session (which checklist, when)
 *   takes      each take's details and measurements (small: listed often)
 *   takeAudio  each take's raw audio, by the take's id (big: read one at a time)
 *
 * The audio is kept exactly as recorded (32-bit float, every mic), never
 * trimmed or normalised, so everything can be reprocessed later. Trimming
 * is a measurement saved with the take, applied on export.
 *
 * Each target has at most one kept take and one new (not yet kept) take.
 * Recording again replaces the new one: that's Redo.
 *
 * This computer only (a dev tool's working files): sessions never sync.
 */
import { askToKeepData, finished, keptOpen, result } from './indexedDb.js';
import { newId } from './newId.js';

const DATABASE = 'bruegrass.sampler';
const DATABASE_VERSION = 1;
/** The shape of a session document; raise it and convert in `upgrade` when it changes. */
export const SESSION_VERSION = 1;

/**
 * @typedef {{
 *   id: string,
 *   version: number,
 *   checklistId: string,
 *   name: string,
 *   createdAt: string,
 *   updatedAt: string
 * }} SamplingSession
 * @typedef {{
 *   id: string,
 *   sessionId: string,
 *   targetId: string,
 *   kept: boolean,
 *   recordedAt: string,
 *   sampleRate: number,
 *   frames: number,
 *   channelCount: number,
 *   analysis: import('$lib/sampler/analysis/analyseTake.js').TakeAnalysis
 * }} TakeRecord
 */

const database = keptOpen(DATABASE, DATABASE_VERSION, (db) => {
	db.createObjectStore('sessions', { keyPath: 'id' });
	db.createObjectStore('takes', { keyPath: 'id' }).createIndex('bySession', 'sessionId');
	db.createObjectStore('takeAudio', { keyPath: 'id' });
});

/** @param {SamplingSession} session */
function upgrade(session) {
	return { ...session, version: SESSION_VERSION };
}

/** Every session, the latest worked on first. */
export async function listSessions() {
	const db = await database();
	/** @type {SamplingSession[]} */
	const sessions = await result(db.transaction('sessions').objectStore('sessions').getAll());
	return sessions.map(upgrade).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * @param {string} checklistId
 * @param {string} name
 * @returns {Promise<SamplingSession>}
 */
export async function createSession(checklistId, name) {
	// Audio is precious here: ask the browser not to clear it when the disk fills
	await askToKeepData();
	const now = new Date().toISOString();
	const session = {
		id: newId(),
		version: SESSION_VERSION,
		checklistId,
		name,
		createdAt: now,
		updatedAt: now
	};
	const db = await database();
	const transaction = db.transaction('sessions', 'readwrite');
	transaction.objectStore('sessions').add(session);
	await finished(transaction);
	return session;
}

/**
 * Delete a session and all its takes, for good.
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
	const db = await database();
	const transaction = db.transaction(['sessions', 'takes', 'takeAudio'], 'readwrite');
	const takes = transaction.objectStore('takes');
	const takeIds = await result(takes.index('bySession').getAllKeys(sessionId));
	for (const id of takeIds) {
		takes.delete(id);
		transaction.objectStore('takeAudio').delete(id);
	}
	transaction.objectStore('sessions').delete(sessionId);
	await finished(transaction);
}

/**
 * Every take in a session: details only, no audio.
 * @param {string} sessionId
 * @returns {Promise<TakeRecord[]>}
 */
export async function listTakes(sessionId) {
	const db = await database();
	return result(db.transaction('takes').objectStore('takes').index('bySession').getAll(sessionId));
}

/**
 * One take's audio, one Float32Array per mic.
 * @param {string} takeId
 * @returns {Promise<Float32Array[] | null>}
 */
export async function readTakeAudio(takeId) {
	const db = await database();
	const stored = await result(db.transaction('takeAudio').objectStore('takeAudio').get(takeId));
	return stored?.channels ?? null;
}

/**
 * Save a just-recorded take for a target, replacing the target's previous
 * new take (if any; a kept one stays until this one is kept).
 * @param {string} sessionId
 * @param {string} targetId
 * @param {import('$lib/recording/takeRecorder.js').Take} take
 * @param {TakeRecord['analysis']} analysis
 * @param {TakeRecord | null} replacing the target's current new take
 * @returns {Promise<TakeRecord>}
 */
export async function saveNewTake(sessionId, targetId, take, analysis, replacing) {
	/** @type {TakeRecord} */
	const record = {
		id: newId(),
		sessionId,
		targetId,
		kept: false,
		recordedAt: new Date().toISOString(),
		sampleRate: take.sampleRate,
		frames: take.channels[0]?.length ?? 0,
		channelCount: take.channels.length,
		analysis
	};
	const db = await database();
	const transaction = db.transaction(['sessions', 'takes', 'takeAudio'], 'readwrite');
	if (replacing) removeTake(transaction, replacing.id);
	transaction.objectStore('takes').add(record);
	transaction.objectStore('takeAudio').add({ id: record.id, channels: take.channels });
	touchSession(transaction, sessionId);
	await finished(transaction);
	return record;
}

/**
 * Keep a new take: it becomes the target's take, replacing the one kept before.
 * @param {TakeRecord} take
 * @param {TakeRecord | null} replacing the target's currently kept take
 * @returns {Promise<TakeRecord>} the kept take
 */
export async function keepTake(take, replacing) {
	const kept = { ...take, kept: true };
	const db = await database();
	const transaction = db.transaction(['sessions', 'takes', 'takeAudio'], 'readwrite');
	if (replacing) removeTake(transaction, replacing.id);
	transaction.objectStore('takes').put(kept);
	touchSession(transaction, take.sessionId);
	await finished(transaction);
	return kept;
}

/**
 * Throw away a take (a new one you don't want, or a kept one to redo).
 * @param {TakeRecord} take
 */
export async function discardTake(take) {
	const db = await database();
	const transaction = db.transaction(['sessions', 'takes', 'takeAudio'], 'readwrite');
	removeTake(transaction, take.id);
	touchSession(transaction, take.sessionId);
	await finished(transaction);
}

/**
 * @param {IDBTransaction} transaction
 * @param {string} takeId
 */
function removeTake(transaction, takeId) {
	transaction.objectStore('takes').delete(takeId);
	transaction.objectStore('takeAudio').delete(takeId);
}

/**
 * Mark a session as just worked on (the list shows the latest first).
 * @param {IDBTransaction} transaction
 * @param {string} sessionId
 */
function touchSession(transaction, sessionId) {
	const sessions = transaction.objectStore('sessions');
	const request = sessions.get(sessionId);
	request.onsuccess = () => {
		if (request.result) sessions.put({ ...request.result, updatedAt: new Date().toISOString() });
	};
}
