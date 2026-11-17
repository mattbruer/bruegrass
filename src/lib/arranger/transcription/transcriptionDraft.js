/**
 * A recording's transcription, kept on this device as you work, so leaving
 * the page (or an iPhone unloading it) never loses your fixes: what belongs
 * to the recording (where beat 1 is, the beats and bars, the time, lanes you
 * added, the fine tuning, how early each section's tune starts, the part
 * being worked on). The chords, sections and key are the song's own,
 * in its chart, which saves itself like any song.
 * One draft per recording, found again by the recording's key.
 */
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';
import { DEFAULT_TIME } from './timeSignatures.js';

const VERSION = 4;
/** Version 3 also kept the chords, key and markers (now read from the song's chart). */
const READABLE = [3, VERSION];

/**
 * @typedef {{
 *   grid: import('./beatGrid.js').BeatGrid,
 *   time: string, lanes: import('./extraLanes.js').ExtraLane[],
 *   cents: number, downbeat: number | null,
 *   pickups: Record<number, number>
 * }} Transcription
 *   downbeat: where you placed beat 1 of bar 1 (seconds; null in an older draft)
 *   cents: the recording's pitch moved by this much (fine tuning)
 *   pickups: bar number → how many beats before it its section's tune starts (a marker's pickup)
 */

/** @param {string} recordingKey */
function draftName(recordingKey) {
	return `transcription:${recordingKey}`;
}

/**
 * @param {string} recordingKey
 * @returns {(Transcription & { savedAt: string, written: string }) | null}
 *   savedAt: when it was last kept; written: a version 3 draft's chart, to know its song by
 */
export function readTranscriptionDraft(recordingKey) {
	const draft = readDraft(draftName(recordingKey));
	const value = draft?.value;
	if (!READABLE.includes(value?.version) || !Array.isArray(value.grid?.beats)) return null;
	return {
		savedAt: draft.savedAt,
		grid: value.grid,
		time: typeof value.time === 'string' ? value.time : DEFAULT_TIME,
		lanes: Array.isArray(value.lanes) ? value.lanes : [],
		cents: typeof value.cents === 'number' ? value.cents : 0,
		downbeat: typeof value.downbeat === 'number' ? value.downbeat : null,
		pickups: value.pickups && typeof value.pickups === 'object' ? value.pickups : {},
		written: typeof value.written === 'string' ? value.written : ''
	};
}

/**
 * @param {string} recordingKey
 * @param {Transcription} transcription
 */
export function writeTranscriptionDraft(recordingKey, transcription) {
	writeDraft(draftName(recordingKey), { version: VERSION, ...transcription });
}

/** @param {string} recordingKey */
export function clearTranscriptionDraft(recordingKey) {
	clearDraft(draftName(recordingKey));
}
