/**
 * A recording's transcription, kept on this device as you work, so leaving
 * the page (or an iPhone unloading it) never loses your fixes: the beats
 * and bars, the chords, the key and time, lanes you added, the markers, the fine tuning, and the chart last written
 * into a song from it.
 * One draft per recording, found again by the recording's key. The song
 * itself is saved with Save, like any song.
 */
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';
import { DEFAULT_TIME } from './timeSignatures.js';

const VERSION = 3;

/**
 * @typedef {{
 *   grid: import('./beatGrid.js').BeatGrid,
 *   chords: Record<number, import('./barChords.js').Slots>,
 *   key: string | null, time: string, lanes: import('./extraLanes.js').ExtraLane[], written: string,
 *   markers: Record<number, string>, cents: number
 * }} Transcription
 *   cents: the recording's pitch moved by this much (fine tuning)
 *   chords: a slot per beat (an older draft kept typed text; barChords.js slotsOf reads both)
 */

/** @param {string} recordingKey */
function draftName(recordingKey) {
	return `transcription:${recordingKey}`;
}

/**
 * @param {string} recordingKey
 * @returns {Transcription | null}
 */
export function readTranscriptionDraft(recordingKey) {
	const value = readDraft(draftName(recordingKey))?.value;
	if (value?.version !== VERSION || !Array.isArray(value.grid?.beats)) return null;
	return {
		grid: value.grid,
		chords: value.chords ?? {},
		key: typeof value.key === 'string' ? value.key : null,
		time: typeof value.time === 'string' ? value.time : DEFAULT_TIME,
		lanes: Array.isArray(value.lanes) ? value.lanes : [],
		markers: value.markers && typeof value.markers === 'object' ? value.markers : {},
		cents: typeof value.cents === 'number' ? value.cents : 0,
		written: value.written ?? ''
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
