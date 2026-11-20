/**
 * What Transcribe worked out about each recording (where the sound hits, the
 * bass and the chords: arranger/transcription/beats/analyseReference.js),
 * kept on this device so it's worked out once, not every time the
 * recording opens. It depends only on the audio, so it never needs saving
 * anywhere else; deleting it only means working it out again.
 *
 * Each is kept with a stamp (the analysis's version and the audio's length
 * and sample rate): a different stamp means it's out of date, and it isn't used.
 */
import { keptOpen, result } from './indexedDb.js';

const DATABASE = 'bruegrass.referenceAnalyses';
const DATABASE_VERSION = 1;
const STORE = 'analyses';

const database = keptOpen(DATABASE, DATABASE_VERSION, (db) => {
	db.createObjectStore(STORE, { keyPath: 'key' });
});

/**
 * @typedef {{ version: number, samples: number, sampleRate: number }} AnalysisStamp
 */

/**
 * The analysis kept for this recording, if it's up to date (else null).
 * @param {string} key the recording's key
 * @param {AnalysisStamp} stamp
 * @returns {Promise<import('$lib/arranger/transcription/beats/analyseReference.js').Analysis | null>}
 */
export async function readReferenceAnalysis(key, stamp) {
	const db = await database();
	const kept = await result(db.transaction(STORE).objectStore(STORE).get(key));
	return kept && JSON.stringify(kept.stamp) === JSON.stringify(stamp) ? kept.analysis : null;
}

/**
 * @param {string} key the recording's key
 * @param {AnalysisStamp} stamp
 * @param {import('$lib/arranger/transcription/beats/analyseReference.js').Analysis} analysis
 */
export async function writeReferenceAnalysis(key, stamp, analysis) {
	const db = await database();
	await result(db.transaction(STORE, 'readwrite').objectStore(STORE).put({ key, stamp, analysis }));
}
